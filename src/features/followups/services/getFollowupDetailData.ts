import { leadDisplayName, leadRouteLabel } from "@/features/dashboard/services/leadPipelinePresentation";
import { getFollowupById, listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

const VERY_URGENT_HOURS = 48;
const URGENT_HOURS = 7 * 24;
const GRACE_DAYS_AFTER_SECOND_FOLLOWUP = 7;

export type StepState = "done" | "current" | "pending" | "blocked";
export type DetailTone = "blue" | "gold" | "red" | "green";

export type TimelineStep = {
  index: number;
  title: string;
  detail: string;
  badge: string;
  state: StepState;
};

export type FollowupHeroMetric = {
  label: string;
  value: string;
  detail?: string;
  tone: DetailTone;
};

export type FollowupDetailData = {
  followupId: string;
  title: string;
  subtitle: string;
  hero: FollowupHeroMetric[];
  timeline: TimelineStep[];
  dossier: Array<{ label: string; value: string }>;
  scenario: { kind: "standard" | "urgent" | "very_urgent"; label: string; description: string };
  relatedFollowups: Array<{ id: string; statusLabel: string; dueAtLabel: string; isCurrent: boolean; tone: DetailTone }>;
  links: { back: string; lead?: string; quote?: string };
  canSend: boolean;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "À confirmer";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "À confirmer";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T12:00:00`)
  );
}

function hoursUntilDeparture(lead: Lead | undefined) {
  if (!lead?.departureDate) return null;
  const departure = new Date(`${lead.departureDate}T12:00:00`).getTime();
  if (Number.isNaN(departure)) return null;
  return (departure - Date.now()) / 36e5;
}

function sequenceKind(lead: Lead | undefined, relatedFollowups: Followup[]) {
  const hours = hoursUntilDeparture(lead);
  if (hours !== null && hours >= 0 && hours < VERY_URGENT_HOURS) return "very_urgent" as const;
  if (hours !== null && hours >= VERY_URGENT_HOURS && hours <= URGENT_HOURS) return "urgent" as const;
  if (relatedFollowups.length === 1) return "urgent" as const;
  return "standard" as const;
}

function followupLabel(followup: Followup | undefined, fallback: string) {
  if (!followup) return fallback;
  return `${followup.status === "SENT" ? "Envoyée" : "Prévue"} le ${formatDateTime(followup.dueAt)}`;
}

function stepStateForFollowup(followup: Followup | undefined, currentId: string): StepState {
  if (!followup) return "pending";
  if (followup.status === "SENT") return "done";
  if (followup.id === currentId) return "current";
  return "pending";
}

function statusLabel(status: Followup["status"]) {
  if (status === "SCHEDULED") return "Programmée";
  if (status === "SENT") return "Envoyée";
  if (status === "OPENED") return "Ouverte";
  if (status === "REPLIED") return "Réponse reçue";
  return status;
}

function nextAction(followup: Followup, lead?: Lead) {
  if (lead?.status === "HUMAN_REVIEW") return "Reprise conseiller";
  if (followup.status === "SCHEDULED" && new Date(followup.dueAt).getTime() <= Date.now()) return "Envoyer maintenant";
  if (followup.status === "SCHEDULED") return "Attendre échéance";
  if (followup.status === "SENT") return "Surveiller réponse";
  return "Suivre le dossier";
}

function scenarioMeta(kind: ReturnType<typeof sequenceKind>) {
  if (kind === "very_urgent") {
    return {
      label: "Très urgent",
      description: "Départ à moins de 48 h — reprise humaine prioritaire, pas de séquence auto complète."
    };
  }
  if (kind === "urgent") {
    return { label: "Urgent J+2", description: "Une relance rapide puis contrôle conseiller si silence client." };
  }
  return {
    label: "Standard J+3 / J+7",
    description: "Séquence classique : relance à J+3, relance à J+7, puis clôture si aucune réponse."
  };
}

function buildTimeline({
  lead,
  quote,
  currentFollowup,
  relatedFollowups
}: {
  lead?: Lead;
  quote?: Quote;
  currentFollowup: Followup;
  relatedFollowups: Followup[];
}): TimelineStep[] {
  const sorted = [...relatedFollowups].sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const first = sorted[0];
  const second = sorted[1];
  const kind = sequenceKind(lead, sorted);
  const quoteSent = quote?.status === "QUOTE_SENT" || lead?.status === "QUOTE_SENT" || sorted.length > 0;
  const closed = lead?.status === "CLOSED";
  const humanReview = lead?.status === "HUMAN_REVIEW";

  if (kind === "very_urgent") {
    return [
      {
        index: 1,
        title: "Départ très urgent",
        detail: "Départ à moins de 48 h : le devis automatique ne doit pas lancer une séquence de relance.",
        badge: "HUMAN_REVIEW",
        state: humanReview ? "done" : "blocked"
      },
      {
        index: 2,
        title: "Reprise conseiller",
        detail: "Un humain vérifie disponibilité, faisabilité et priorisation commerciale.",
        badge: "manuel",
        state: humanReview ? "current" : "pending"
      },
      {
        index: 3,
        title: "Décision commerciale",
        detail: "Le dossier est traité hors automatisation relance.",
        badge: "hors auto",
        state: closed ? "done" : "pending"
      }
    ];
  }

  if (kind === "urgent") {
    return [
      {
        index: 1,
        title: "Devis envoyé",
        detail: quoteSent ? "Le devis peut être envoyé malgré l'urgence traitable." : "Le devis doit être envoyé avant relance.",
        badge: quote?.calculation.quoteNumber ?? "devis",
        state: quoteSent ? "done" : "pending"
      },
      {
        index: 2,
        title: "Relance unique J+2",
        detail: followupLabel(first, "Une seule relance est prévue deux jours après l'envoi."),
        badge: first?.status ?? "SCHEDULED",
        state: stepStateForFollowup(first, currentFollowup.id)
      },
      {
        index: 3,
        title: "Contrôle humain si silence",
        detail: "Après la relance urgente, le dossier revient en validation humaine plutôt qu'en clôture automatique.",
        badge: humanReview ? "HUMAN_REVIEW" : "à surveiller",
        state: humanReview ? "current" : first?.status === "SENT" ? "current" : "pending"
      }
    ];
  }

  return [
    {
      index: 1,
      title: "Devis envoyé",
      detail: quoteSent ? "La séquence standard de relance est active." : "La relance dépend de l'envoi préalable du devis.",
      badge: quote?.calculation.quoteNumber ?? "devis",
      state: quoteSent ? "done" : "pending"
    },
    {
      index: 2,
      title: "Relance 1 — J+3",
      detail: followupLabel(first, "Première relance standard trois jours après l'envoi."),
      badge: first?.status ?? "SCHEDULED",
      state: stepStateForFollowup(first, currentFollowup.id)
    },
    {
      index: 3,
      title: "Relance 2 — J+7 puis clôture",
      detail: second
        ? `${followupLabel(second, "Deuxième relance")}. Sans réponse, clôture ${GRACE_DAYS_AFTER_SECOND_FOLLOWUP} jours après l'échéance.`
        : `Deuxième relance standard à J+7, puis clôture après ${GRACE_DAYS_AFTER_SECOND_FOLLOWUP} jours sans réponse.`,
      badge: closed ? "CLOSED" : second?.status ?? "à venir",
      state: closed ? "done" : stepStateForFollowup(second, currentFollowup.id)
    }
  ];
}

export async function getFollowupDetailData(followupId: string): Promise<FollowupDetailData | null> {
  const [followup, leads, quotes, followups] = await Promise.all([
    getFollowupById(followupId),
    listLeads(),
    listQuotes(),
    listFollowups()
  ]);

  if (!followup) return null;

  const lead = leads.find((item) => item.id === followup.leadId);
  const quote = followup.quoteId ? quotes.find((item) => item.id === followup.quoteId) : undefined;
  const relatedFollowups = followup.quoteId
    ? followups.filter((item) => item.quoteId === followup.quoteId)
    : followups.filter((item) => item.leadId === followup.leadId);
  const timeline = buildTimeline({ lead, quote, currentFollowup: followup, relatedFollowups });
  const kind = sequenceKind(lead, relatedFollowups);
  const scenario = scenarioMeta(kind);
  const isOverdue = followup.status === "SCHEDULED" && new Date(followup.dueAt).getTime() <= Date.now();
  const action = nextAction(followup, lead);

  const hero: FollowupHeroMetric[] = [
    {
      label: "Statut relance",
      value: statusLabel(followup.status),
      detail: followup.channel === "email" ? "Canal email" : `Canal ${followup.channel}`,
      tone: followup.status === "SENT" ? "green" : "blue"
    },
    {
      label: "Échéance",
      value: formatDateTime(followup.dueAt),
      detail: isOverdue ? "En retard — action immédiate" : "Date planifiée",
      tone: isOverdue ? "red" : "gold"
    },
    {
      label: "Scénario",
      value: scenario.label,
      detail: `${relatedFollowups.length} relance(s) liée(s)`,
      tone: kind === "very_urgent" ? "red" : kind === "urgent" ? "gold" : "blue"
    },
    {
      label: "Prochaine action",
      value: action,
      detail: lead?.status === "HUMAN_REVIEW" ? "Dossier en validation humaine" : undefined,
      tone: isOverdue || action === "Envoyer maintenant" ? "red" : action === "Reprise conseiller" ? "gold" : "green"
    }
  ];

  return {
    followupId: followup.id,
    title: leadDisplayName(lead, "Relance client"),
    subtitle: `${leadRouteLabel(lead)} · suivi email, échéance et sortie de scénario.`,
    hero,
    timeline,
    dossier: [
      { label: "Client", value: leadDisplayName(lead) },
      { label: "Email", value: lead?.email ?? "À confirmer" },
      { label: "Trajet", value: leadRouteLabel(lead) },
      { label: "Départ", value: formatDate(lead?.departureDate) },
      { label: "Devis", value: quote?.calculation.quoteNumber ?? followup.quoteId ?? "Sans devis" },
      { label: "Montant TTC", value: quote ? `${Math.round(quote.calculation.priceTtc)} €` : "—" },
      { label: "Canal", value: followup.channel },
      { label: "ID relance", value: followup.id }
    ],
    scenario: { kind, ...scenario },
    relatedFollowups: [...relatedFollowups]
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .map((item) => ({
        id: item.id,
        statusLabel: statusLabel(item.status),
        dueAtLabel: formatDateTime(item.dueAt),
        isCurrent: item.id === followup.id,
        tone:
          item.id === followup.id
            ? isOverdue && item.status === "SCHEDULED"
              ? "red"
              : "blue"
            : item.status === "SENT"
              ? "green"
              : "gold"
      })),
    links: {
      back: "/dashboard/relances",
      lead: lead ? `/dashboard/demandes/${lead.id}` : undefined,
      quote: quote ? `/client/devis/${quote.id}` : undefined
    },
    canSend: followup.status === "SCHEDULED"
  };
}
