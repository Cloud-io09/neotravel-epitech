import Link from "next/link";
import { getPipelineData } from "@/features/dashboard/services/getPipelineData";
import { getModelRuns } from "@/features/admin/services/getModelRuns";
import { DashboardHeader, DataTable, KpiGrid, Note, Panel } from "@/features/dashboard/components/DashboardPageKit";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import { dateTime, euro, shortId } from "@/features/dashboard/components/pipelineFormat";
import styles from "@/features/dashboard/components/dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function ObservabilityPage() {
  const [{ quotes, auditLogs }, modelRuns] = await Promise.all([getPipelineData(), getModelRuns()]);

  // Distribution of recent backend events — what the backend has been doing.
  const actionCounts = auditLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.action] = (acc[log.action] ?? 0) + 1;
    return acc;
  }, {});
  const actionRows = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]);

  const aiCost = modelRuns.reduce((sum, run) => sum + (run.costEur ?? 0), 0);
  const aiLatency = modelRuns.length
    ? Math.round(modelRuns.reduce((sum, run) => sum + (run.latencyMs ?? 0), 0) / modelRuns.length)
    : 0;

  return (
    <main className={styles.page}>
      <DashboardHeader
        title="Observabilité"
        subtitle="Ce que fait le backend : transitions métier tracées, devis déterministes, appels IA. La preuve de ce qui s'est passé."
      />

      <Panel
        title="Activité backend (événements récents)"
        subtitle="Répartition des dernières transitions tracées dans audit_logs."
      >
        {actionRows.length === 0 ? (
          <Note>Aucun événement tracé pour l&apos;instant.</Note>
        ) : (
          <DataTable
            columns={["Événement", "Occurrences (récent)"]}
            columnsTemplate="2fr 1fr"
            rows={actionRows.map(([action, count]) => ({ cells: [action, count] }))}
          />
        )}
      </Panel>

      <Panel
        title="Appels IA (model_runs)"
        subtitle="Coûts et latence des appels IA persistés. Le chat prospect trace ses appels dans les logs serveur (Vercel) ; cette table se remplit une fois la persistance branchée."
      >
        <KpiGrid
          kpis={[
            { label: "Appels persistés", value: modelRuns.length, tone: "blue" },
            { label: "Coût cumulé", value: euro(aiCost), tone: "green" },
            { label: "Latence moyenne", value: modelRuns.length ? `${aiLatency} ms` : "—", tone: "gold" },
          ]}
        />
        {modelRuns.length === 0 ? (
          <Note>
            Aucun appel IA persisté en base. Les appels du chat sont visibles dans les logs serveur
            (console Vercel) ; brancher l&apos;écriture model_runs les fera remonter ici.
          </Note>
        ) : (
          <DataTable
            columns={["Heure", "Usage", "Modèle", "Coût", "Latence", "Statut"]}
            columnsTemplate="1fr 1fr 1.2fr .7fr .7fr .7fr"
            rows={modelRuns.slice(0, 25).map((run) => ({
              cells: [
                dateTime(run.createdAt),
                run.purpose,
                run.model,
                euro(run.costEur ?? 0),
                run.latencyMs != null ? `${run.latencyMs} ms` : "—",
                run.status ?? "—",
              ],
            }))}
          />
        )}
      </Panel>

      <Panel
        title="Devis récents"
        subtitle="Montants issus uniquement du moteur déterministe. Le dashboard ne recalcule jamais."
      >
        {quotes.length === 0 ? (
          <Note>Aucun devis généré pour l&apos;instant.</Note>
        ) : (
          <DataTable
            columns={["N° devis", "Lead", "HT", "TTC", "Distance", "Empreinte", "Statut", "Créé"]}
            columnsTemplate=".9fr .6fr .6fr .6fr .7fr .9fr .8fr .9fr"
            rows={quotes.slice(0, 25).map((quote) => ({
              href: `/client/devis/${quote.id}`,
              cells: [
                quote.quoteNumber,
                shortId(quote.leadId),
                euro(quote.priceHt),
                euro(quote.priceTtc),
                quote.distanceKm != null ? `${quote.distanceKm} km` : "—",
                quote.deterministicHash ? `${quote.deterministicHash.slice(0, 10)}…` : "—",
                <StatusBadge key="s" status={quote.status} />,
                dateTime(quote.createdAt),
              ],
            }))}
          />
        )}
      </Panel>

      <Panel
        title="Journal d'audit"
        subtitle="Chaque transition métier tracée : création de lead, devis calculé, email simulé, relance, validation humaine."
      >
        {auditLogs.length === 0 ? (
          <Note>Aucun événement d&apos;audit enregistré.</Note>
        ) : (
          <DataTable
            columns={["Action", "Objet", "Référence", "Quand"]}
            columnsTemplate="1.4fr .8fr 1fr 1fr"
            rows={auditLogs.map((log) => ({
              cells: [
                log.action,
                log.entityType,
                log.entityType === "quote" && log.entityId ? (
                  <Link key="ref" href={`/client/devis/${log.entityId}`}>
                    {shortId(log.entityId)}
                  </Link>
                ) : log.entityType === "lead" && log.entityId ? (
                  <Link key="ref" href={`/dashboard/demandes/${log.entityId}`}>
                    {shortId(log.entityId)}
                  </Link>
                ) : (
                  shortId(log.entityId)
                ),
                dateTime(log.createdAt),
              ],
            }))}
          />
        )}
      </Panel>
    </main>
  );
}
