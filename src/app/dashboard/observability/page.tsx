import Link from "next/link";
import { getPipelineData } from "@/features/dashboard/services/getPipelineData";
import { DashboardHeader, DataTable, Note, Panel } from "@/features/dashboard/components/DashboardPageKit";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import { dateTime, euro, shortId } from "@/features/dashboard/components/pipelineFormat";
import styles from "@/features/dashboard/components/dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function ObservabilityPage() {
  const { quotes, auditLogs } = await getPipelineData();

  return (
    <main className={styles.page}>
      <DashboardHeader
        title="Devis & traçabilité"
        subtitle="Devis calculés par calculer_devis() et journal d'audit des transitions métier. La preuve de ce qui s'est passé."
      />

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
