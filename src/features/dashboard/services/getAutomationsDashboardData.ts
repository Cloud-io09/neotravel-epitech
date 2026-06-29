import { getIntegrationsStatus } from "@/features/integrations/integrations";
import { listFollowups, listQuotes } from "@/shared/lib/data";
import type { AlphaMetric } from "@/features/dashboard/components/AlphaDashboardLayout";

export type AutomationsDashboardData = {
  hero: AlphaMetric[];
  statusLabel: string;
  n8nConnected: boolean;
  workflows: Array<[string, string, string]>;
  summary: {
    scheduled: number;
    sent: number;
    quotesReady: number;
    workflowCount: number;
  };
};

export async function getAutomationsDashboardData(): Promise<AutomationsDashboardData> {
  const [followups, quotes] = await Promise.all([listFollowups(), listQuotes()]);
  const integrations = getIntegrationsStatus();
  const n8nOn = Boolean(integrations.find((integration) => integration.id === "n8n")?.connected);
  const scheduled = followups.filter((followup) => followup.status === "SCHEDULED").length;
  const sent = followups.filter((followup) => followup.status !== "SCHEDULED").length;
  const quotesReady = quotes.filter((quote) => quote.status === "QUOTE_READY").length;
  const statusLabel = n8nOn ? "Actif" : "Simulé (démo)";

  const workflows: Array<[string, string, string]> = [
    ["Envoi de devis", "Devis prêt", "Email au client"],
    ["Relance J+2 (urgent)", "Sans réponse", "Email de relance"],
    ["Relance J+7", "Standard", "Email de relance"],
    ["Notification validation", "Passage en validation humaine", "Alerte interne"]
  ];

  return {
    hero: [
      {
        label: "n8n",
        value: n8nOn ? "Connecté" : "Non connecté",
        detail: n8nOn ? "Webhooks configurés" : "Simulation locale",
        tone: n8nOn ? "green" : "red"
      },
      {
        label: "Relances programmées",
        value: scheduled,
        detail: "En attente d'envoi",
        tone: scheduled > 0 ? "gold" : "blue",
        href: "/dashboard/relances?status=scheduled"
      },
      {
        label: "Relances envoyées",
        value: sent,
        detail: "Historique traité",
        tone: "blue",
        href: "/dashboard/relances"
      },
      {
        label: "Devis prêts",
        value: quotesReady,
        detail: "À envoyer automatiquement",
        tone: quotesReady > 0 ? "gold" : "green",
        href: "/dashboard/devis?status=open"
      }
    ],
    statusLabel,
    n8nConnected: n8nOn,
    workflows,
    summary: {
      scheduled,
      sent,
      quotesReady,
      workflowCount: workflows.length
    }
  };
}
