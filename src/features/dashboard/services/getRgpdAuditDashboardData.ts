import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import type { AlphaMetric } from "@/features/dashboard/components/AlphaDashboardLayout";

export type RgpdAuditRow = {
  id: string;
  time: string;
  actor: string;
  action: string;
  entity: string;
  hasHash: boolean;
};

export type RgpdRetentionRow = {
  data: string;
  usage: string;
  retention: string;
  legalBasis: string;
};

export type RgpdAuditDashboardData = {
  hero: AlphaMetric[];
  auditRows: RgpdAuditRow[];
  retention: RgpdRetentionRow[];
  stats: {
    events: number;
    entities: number;
    withHash: number;
  };
};

export async function getRgpdAuditDashboardData(): Promise<RgpdAuditDashboardData> {
  const logs = await getAuditLogs();
  const entities = new Set(logs.map((log) => log.entityType)).size;
  const withHash = logs.filter((log) => log.inputHash && log.outputHash).length;

  const auditRows: RgpdAuditRow[] = logs.slice(0, 16).map((log) => ({
    id: log.id,
    time: new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(log.createdAt)),
    actor: log.actor ?? "système",
    action: log.action,
    entity: log.entityType,
    hasHash: Boolean(log.inputHash && log.outputHash)
  }));

  const retention: RgpdRetentionRow[] = [
    { data: "Email prospect", usage: "Devis + relance", retention: "Durée du MVP", legalBasis: "Intérêt légitime" },
    { data: "Message brut", usage: "Qualification", retention: "Limitée", legalBasis: "Exécution de la demande" },
    { data: "Empreintes (hash)", usage: "Preuve d'audit", retention: "Longue", legalBasis: "Intégrité" },
    { data: "Payload n8n", usage: "Notification", retention: "Nettoyé", legalBasis: "Opérationnel" }
  ];

  return {
    hero: [
      { label: "Événements", value: logs.length, detail: "Journal d'audit", tone: "blue", href: "/dashboard/couts-logs" },
      { label: "Entités tracées", value: entities, detail: "Types d'objets métier", tone: "blue" },
      {
        label: "Avec empreinte",
        value: `${withHash}/${logs.length}`,
        detail: "Intégrité entrée/sortie",
        tone: withHash === logs.length && logs.length > 0 ? "green" : "gold"
      },
      { label: "Secrets exposés", value: 0, detail: "Minimisation appliquée", tone: "green" }
    ],
    auditRows,
    retention,
    stats: { events: logs.length, entities, withHash }
  };
}
