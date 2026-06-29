import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import { getModelRuns } from "@/features/admin/services/getModelRuns";
import { getIntegrationsStatus } from "@/features/integrations/integrations";
import { isLostQuote, isWonQuote } from "@/features/dashboard/services/quoteOutcome";
import { getDataMode } from "@/shared/lib/demo/demoMode";
import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";

export type AdminTone = "blue" | "gold" | "red" | "green";

export type AdminHeroMetric = {
  label: string;
  value: string | number;
  detail?: string;
  tone: AdminTone;
  href?: string;
};

export type AdminDashboardData = {
  hero: AdminHeroMetric[];
  activite: {
    leadsTotal: number;
    toTreat: number;
    humanReview: number;
    quotesTotal: number;
    quotesSent: number;
    quotesAccepted: number;
    followupsTotal: number;
    followupsScheduled: number;
    followupsOverdue: number;
  };
  systeme: {
    dataMode: string;
    isSupabase: boolean;
    aiCalls: number;
    aiCostLabel: string;
    n8nConnected: boolean;
    integrationsCount: number;
  };
  audit: Array<{ id: string; time: string; actor: string; action: string; entity: string }>;
  shortcuts: Array<{ label: string; href: string; description: string }>;
};

function euro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(value);
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [leads, quotes, followups, logs, runs] = await Promise.all([
    listLeads(),
    listQuotes(),
    listFollowups(),
    getAuditLogs(),
    getModelRuns()
  ]);

  const integrations = getIntegrationsStatus();
  const dataMode = getDataMode();
  const isSupabase = dataMode === "supabase";
  const aiCost = runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const toTreat = leads.filter((lead) => ["NEW", "INCOMPLETE", "HUMAN_REVIEW"].includes(lead.status)).length;
  const humanReview = leads.filter((lead) => lead.status === "HUMAN_REVIEW").length;
  const quotesSent = quotes.filter((quote) => quote.status === "QUOTE_SENT").length;
  const quotesAccepted = quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId))).length;
  const scheduled = followups.filter((followup) => followup.status === "SCHEDULED");
  const now = Date.now();
  const overdue = scheduled.filter((followup) => new Date(followup.dueAt).getTime() < now);
  const n8nConnected = Boolean(integrations.find((item) => item.id === "n8n")?.connected);

  const hero: AdminHeroMetric[] = [
    {
      label: "À traiter",
      value: toTreat,
      detail: `${humanReview} validation(s) humaine(s)`,
      tone: toTreat > 0 ? "red" : "green",
      href: "/dashboard/demandes"
    },
    {
      label: "Coût IA cumulé",
      value: euro(aiCost),
      detail: `${runs.length} appel(s) enregistré(s)`,
      tone: aiCost > 0 ? "gold" : "blue",
      href: "/dashboard/couts-ia-admin"
    },
    {
      label: "Source données",
      value: isSupabase ? "Supabase" : "Démo",
      detail: `Mode ${dataMode}`,
      tone: isSupabase ? "green" : "gold"
    },
    {
      label: "Audit",
      value: logs.length,
      detail: "Événements tracés",
      tone: "blue",
      href: "/dashboard/couts-logs"
    }
  ];

  return {
    hero,
    activite: {
      leadsTotal: leads.length,
      toTreat,
      humanReview,
      quotesTotal: quotes.length,
      quotesSent,
      quotesAccepted,
      followupsTotal: followups.length,
      followupsScheduled: scheduled.length,
      followupsOverdue: overdue.length
    },
    systeme: {
      dataMode,
      isSupabase,
      aiCalls: runs.length,
      aiCostLabel: euro(aiCost),
      n8nConnected,
      integrationsCount: integrations.length
    },
    audit: logs.slice(0, 12).map((log) => ({
      id: log.id,
      time: new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(log.createdAt)),
      actor: log.actor ?? "système",
      action: log.action,
      entity: log.entityType
    })),
    shortcuts: [
      { label: "KPIs commerciaux", href: "/dashboard/kpis", description: "Indicateurs pipeline et conversion" },
      { label: "Tarification", href: "/dashboard/pricing", description: "Matrices et paramètres devis" },
      { label: "Gouvernance", href: "/dashboard/gouvernance", description: "Équipe, rôles et permissions" },
      { label: "Logs système", href: "/dashboard/couts-logs", description: "Audit et traces techniques" },
      { label: "Coûts IA", href: "/dashboard/couts-ia-admin", description: "Appels modèle et dépenses" },
      { label: "Croissance", href: "/dashboard/croissance", description: "Analyse commerciale avancée" }
    ]
  };
}
