import {
  formatCommercialDate,
  formatEuro,
  getLeadCommercialAction,
  latestQuoteByLeadId,
  leadDisplayName,
  leadRouteLabel,
  nextScheduledFollowup,
  quoteLabel,
  type LeadCommercialAction
} from "@/features/dashboard/services/leadPipelinePresentation";
import { currentDataMode } from "@/shared/lib/data";
import { listAuditLogs, listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import type { Lead, LeadStatus } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

export type GeneralTone = "blue" | "gold" | "red" | "green";

export type GeneralHeroMetric = {
  label: string;
  value: string | number;
  detail?: string;
  tone: GeneralTone;
  href?: string;
};

export type GeneralAction = {
  id: string;
  client: string;
  status: LeadStatus | "SCHEDULED";
  what: string;
  cta: string;
  href: string;
  priority: number;
};

export type PipelineGroup = {
  label: string;
  value: number;
  hint: string;
  href: string;
  tone: GeneralTone;
};

export type PipelineRow = {
  id: string;
  href: string;
  dossier: string;
  trajet: string;
  status: LeadStatus;
  actionLabel: string;
  actionDetail: string;
  actionTone: LeadCommercialAction["tone"];
  devis: string;
  relance: string;
};

export type AuditRow = {
  id: string;
  time: string;
  actor: string;
  action: string;
  entity: string;
  href?: string;
};

export type GeneralDashboardData = {
  hero: GeneralHeroMetric[];
  dataMode: "supabase" | "mock";
  dataModeLabel: string;
  pipelineGroups: PipelineGroup[];
  actions: GeneralAction[];
  pipelineRows: PipelineRow[];
  auditRows: AuditRow[];
  stats: {
    leadsTotal: number;
    quotesTotal: number;
    quoteVolumeLabel: string;
    scheduledFollowups: number;
  };
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function quoteTotal(quote: Quote) {
  return quote.calculation.priceTtc ?? quote.calculation.totalAmount ?? 0;
}

function countByStatus(leads: Lead[], statuses: LeadStatus[]) {
  return leads.filter((lead) => statuses.includes(lead.status)).length;
}

function buildNextActions(leads: Lead[], quotes: Quote[], followups: Parameters<typeof nextScheduledFollowup>[1]) {
  const actions: GeneralAction[] = [];
  const quoteByLeadId = latestQuoteByLeadId(quotes);
  const now = Date.now();

  for (const lead of leads) {
    const quote = quoteByLeadId.get(lead.id);
    const followup = nextScheduledFollowup(lead.id, followups);
    const action = getLeadCommercialAction({ lead, quote, followup, now });
    if (action.priority > 6) continue;
    actions.push({
      id: lead.id,
      client: leadDisplayName(lead),
      status: lead.status,
      what: action.label,
      cta: action.cta,
      href: action.href,
      priority: action.priority
    });
  }

  for (const followup of followups) {
    if (followup.status !== "SCHEDULED") continue;
    const dueAt = new Date(followup.dueAt).getTime();
    const lead = leads.find((item) => item.id === followup.leadId);
    if (lead) continue;
    actions.push({
      id: `followup-${followup.id}`,
      client: "Lead introuvable",
      status: "SCHEDULED",
      what: dueAt < now ? "Relance en retard" : `Relance prévue le ${formatCommercialDate(followup.dueAt)}`,
      cta: "Relancer",
      href: `/dashboard/relances/${followup.id}`,
      priority: dueAt < now ? 0 : 5
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

export async function getGeneralDashboardData(): Promise<GeneralDashboardData> {
  const [leads, quotes, followups, auditLogs] = await Promise.all([
    listLeads(),
    listQuotes(),
    listFollowups(),
    listAuditLogs()
  ]);

  const mode = currentDataMode();
  const isSupabase = mode === "supabase";
  const quoteByLeadId = latestQuoteByLeadId(quotes);
  const actions = buildNextActions(leads, quotes, followups);
  const scheduledFollowups = followups.filter((followup) => followup.status === "SCHEDULED");
  const overdueFollowups = scheduledFollowups.filter((followup) => new Date(followup.dueAt).getTime() < Date.now());
  const quoteVolume = quotes.reduce((sum, quote) => sum + quoteTotal(quote), 0);
  const humanReviewCount = countByStatus(leads, ["HUMAN_REVIEW"]);
  const incompleteCount = countByStatus(leads, ["INCOMPLETE"]);
  const quoteReadyCount = quotes.filter((quote) => quote.status === "QUOTE_READY").length;
  const toQualifyCount = countByStatus(leads, ["NEW", "INCOMPLETE"]);

  const hero: GeneralHeroMetric[] = [
    {
      label: "Actions prioritaires",
      value: actions.length,
      detail: actions.length > 0 ? "Dossiers à reprendre maintenant" : "Aucune urgence détectée",
      tone: actions.length > 0 ? "red" : "green",
      href: actions.length > 0 ? "#actions" : undefined
    },
    {
      label: "Validation humaine",
      value: humanReviewCount,
      detail: "Dossiers bloquants",
      tone: humanReviewCount > 0 ? "gold" : "green",
      href: "/dashboard/human-review"
    },
    {
      label: "Relances en retard",
      value: overdueFollowups.length,
      detail: `${scheduledFollowups.length} programmée(s)`,
      tone: overdueFollowups.length > 0 ? "red" : "green",
      href: "/dashboard/relances?status=overdue"
    },
    {
      label: "Pipeline actif",
      value: leads.length,
      detail: `${quoteReadyCount} devis prêts · ${formatEuro(quoteVolume)}`,
      tone: "blue",
      href: "/dashboard/demandes"
    }
  ];

  const pipelineGroups: PipelineGroup[] = [
    {
      label: "À qualifier",
      value: toQualifyCount,
      hint: `${incompleteCount} incomplète(s)`,
      href: "/dashboard/demandes",
      tone: toQualifyCount > 0 ? "gold" : "blue"
    },
    {
      label: "À valider",
      value: humanReviewCount,
      hint: "Reprise humaine",
      href: "/dashboard/human-review",
      tone: humanReviewCount > 0 ? "gold" : "green"
    },
    {
      label: "Devis prêts",
      value: quoteReadyCount,
      hint: formatEuro(quoteVolume),
      href: "/dashboard/devis?status=open",
      tone: quoteReadyCount > 0 ? "blue" : "green"
    },
    {
      label: "Relances",
      value: scheduledFollowups.length,
      hint: `${overdueFollowups.length} en retard`,
      href: "/dashboard/relances",
      tone: overdueFollowups.length > 0 ? "red" : "gold"
    }
  ];

  const pipelineRows: PipelineRow[] = leads.slice(0, 16).map((lead) => {
    const quote = quoteByLeadId.get(lead.id);
    const followup = nextScheduledFollowup(lead.id, followups);
    const action = getLeadCommercialAction({ lead, quote, followup });
    return {
      id: lead.id,
      href: `/dashboard/demandes/${lead.id}`,
      dossier: leadDisplayName(lead),
      trajet: leadRouteLabel(lead),
      status: lead.status,
      actionLabel: action.label,
      actionDetail: action.detail,
      actionTone: action.tone,
      devis: quoteLabel(quote),
      relance: followup ? formatCommercialDate(followup.dueAt) : "Aucune"
    };
  });

  const auditRows: AuditRow[] = auditLogs.slice(0, 12).map((log) => ({
    id: log.id,
    time: formatDateTime(log.createdAt),
    actor: log.actor ?? "système",
    action: log.action,
    entity: log.entityType,
    href: log.entityType === "lead" ? `/dashboard/demandes/${log.entityId}` : undefined
  }));

  return {
    hero,
    dataMode: isSupabase ? "supabase" : "mock",
    dataModeLabel: isSupabase ? "Supabase" : "Mode démo local",
    pipelineGroups,
    actions,
    pipelineRows,
    auditRows,
    stats: {
      leadsTotal: leads.length,
      quotesTotal: quotes.length,
      quoteVolumeLabel: formatEuro(quoteVolume),
      scheduledFollowups: scheduledFollowups.length
    }
  };
}
