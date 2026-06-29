import {
  formatCommercialDate,
  getLeadCommercialAction,
  leadDisplayName,
  leadRouteLabel,
  quoteLabel
} from "@/features/dashboard/services/leadPipelinePresentation";
import { humanReviewReasonLabel } from "@/features/human-review/reasonLabels";
import {
  classifyLead,
  currentStage,
  PIPELINE_STAGES
} from "@/features/lead-pipeline/leadPipeline";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import { getStatusDisplay } from "@/shared/lib/status/statusDisplay";

export type LeadDetailTone = "blue" | "gold" | "red" | "green";

export type LeadPipelineStep = {
  index: number;
  title: string;
  detail: string;
  badge: string;
  state: "done" | "current" | "pending" | "blocked";
};

export type LeadDetailPageData = {
  title: string;
  subtitle: string;
  hero: Array<{
    label: string;
    value: string;
    detail?: string;
    tone: LeadDetailTone;
  }>;
  routing: {
    kind: "AI_AUTO" | "INCOMPLETE" | "HUMAN_REVIEW";
    label: string;
    description: string;
  };
  dossier: Array<{ label: string; value: string }>;
  pipelineSteps: LeadPipelineStep[];
  action: {
    label: string;
    detail: string;
    cta: string;
    href: string;
    tone: "critical" | "warning" | "info" | "success" | "muted";
  };
  links: {
    back: string;
    quote?: string;
    followup?: string;
    humanReview?: string;
  };
};

function tripTypeLabel(tripType: Lead["tripType"]) {
  if (tripType === "round_trip") return "Aller-retour";
  if (tripType === "one_way") return "Aller simple";
  return "À confirmer";
}

function routingKind(routing: ReturnType<typeof classifyLead>["routing"]) {
  if (routing === "HUMAN_REVIEW") return "HUMAN_REVIEW" as const;
  if (routing === "INCOMPLETE") return "INCOMPLETE" as const;
  return "AI_AUTO" as const;
}

function routingLabel(kind: LeadDetailPageData["routing"]["kind"]) {
  if (kind === "HUMAN_REVIEW") return "Reprise humaine requise";
  if (kind === "INCOMPLETE") return "Demande à compléter";
  return "Traitement automatique";
}

function heroToneForAction(tone: LeadDetailPageData["action"]["tone"]): LeadDetailTone {
  if (tone === "critical") return "red";
  if (tone === "warning") return "gold";
  if (tone === "success") return "green";
  return "blue";
}

export function buildLeadDetailPageData({
  lead,
  quote,
  followup
}: {
  lead: Lead;
  quote?: Quote;
  followup?: Followup;
}): LeadDetailPageData {
  const routing = classifyLead(lead);
  const kind = routingKind(routing.routing);
  const action = getLeadCommercialAction({ lead, quote, followup });
  const status = getStatusDisplay(lead.status);
  const stage = currentStage(lead);
  const activeIndex = PIPELINE_STAGES.findIndex((item) => item.key === stage);
  const hasMissingFields = (lead.missingFields?.length ?? 0) > 0;

  const pipelineSteps: LeadPipelineStep[] = PIPELINE_STAGES.map((item, index) => {
    let state: LeadPipelineStep["state"] = index < activeIndex ? "done" : index === activeIndex ? "current" : "pending";
    if (kind === "HUMAN_REVIEW" && item.key === "CLASSEMENT" && index === activeIndex) state = "blocked";
    if (kind === "INCOMPLETE" && item.key === "CLASSEMENT" && index === activeIndex) state = "blocked";

    return {
      index: index + 1,
      title: item.label,
      detail: item.hint,
      badge: state === "done" ? "Terminé" : state === "current" ? "En cours" : state === "blocked" ? "Bloqué" : "À venir",
      state
    };
  });

  const hero: LeadDetailPageData["hero"] = [
    {
      label: "Statut",
      value: status.label,
      detail: lead.organization ?? lead.email ?? "Prospect",
      tone: lead.status === "HUMAN_REVIEW" ? "gold" : lead.status === "LOST" ? "red" : lead.status === "WON" ? "green" : "blue"
    },
    {
      label: "Devis",
      value: quote ? quote.calculation.quoteNumber : "Aucun",
      detail: quote ? quoteLabel(quote) : "Pas encore généré",
      tone: quote ? "green" : "gold"
    },
    {
      label: "Relance",
      value: followup ? formatCommercialDate(followup.dueAt) : "Aucune",
      detail: followup ? (followup.status === "SCHEDULED" ? "Programmée" : "Traitée") : "Pas de relance active",
      tone: followup ? "gold" : "blue"
    },
    {
      label: "Départ",
      value: lead.departureDate ?? "À préciser",
      detail: `${lead.passengerCount ?? "?"} pax · ${tripTypeLabel(lead.tripType)}`,
      tone: heroToneForAction(action.tone)
    }
  ];

  const dossier: LeadDetailPageData["dossier"] = [
    { label: "Organisation", value: lead.organization ?? "À confirmer" },
    { label: "Contact", value: lead.contactName ?? "À confirmer" },
    { label: "Email", value: lead.email ?? "À confirmer" },
    { label: "Téléphone", value: lead.phone ?? "À confirmer" },
    { label: "Type client", value: lead.clientType ?? "À confirmer" },
    { label: "Trajet", value: leadRouteLabel(lead) },
    { label: "Date départ", value: lead.departureDate ?? "À confirmer" },
    { label: "Date retour", value: lead.returnDate ?? "—" },
    { label: "Passagers", value: lead.passengerCount != null ? String(lead.passengerCount) : "À confirmer" },
    { label: "Type trajet", value: tripTypeLabel(lead.tripType) },
    { label: "Options", value: lead.options.length ? lead.options.join(", ") : "Aucune" },
    { label: "Devis", value: quoteLabel(quote) }
  ];

  if (lead.humanReviewReason) {
    dossier.push({ label: "Motif revue", value: humanReviewReasonLabel(lead.humanReviewReason) });
  }

  return {
    title: leadDisplayName(lead),
    subtitle: leadRouteLabel(lead),
    hero,
    routing: {
      kind,
      label: routingLabel(kind),
      description:
        kind === "HUMAN_REVIEW"
          ? humanReviewReasonLabel(lead.humanReviewReason) || routing.reason
          : hasMissingFields
            ? `Champs manquants : ${(lead.missingFields ?? []).join(", ")}`
            : routing.reason
    },
    dossier,
    pipelineSteps,
    action,
    links: {
      back: "/dashboard/demandes",
      quote: quote ? `/client/devis/${quote.id}` : undefined,
      followup: followup ? `/dashboard/relances/${followup.id}` : undefined,
      humanReview: lead.status === "HUMAN_REVIEW" ? "/dashboard/human-review" : undefined
    }
  };
}
