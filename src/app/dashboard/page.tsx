import { getPipelineData } from "@/features/dashboard/services/getPipelineData";
import { DashboardHeader, DataTable, Note, Panel } from "@/features/dashboard/components/DashboardPageKit";
import { PipelineOverview } from "@/features/dashboard/components/PipelineOverview";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import { dateOnly, euro, route, shortId, tripTypeLabel } from "@/features/dashboard/components/pipelineFormat";
import styles from "@/features/dashboard/components/dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { leads, statusCounts, total } = await getPipelineData();

  return (
    <main className={styles.page}>
      <DashboardHeader
        title="Pipeline NeoTravel"
        subtitle="Où en est chaque demande, ce qui a été fait, et ce qui attend un humain. Données réelles Supabase."
      />

      <PipelineOverview statusCounts={statusCounts} total={total} />

      <Panel
        title="Leads"
        subtitle="Chaque demande prospect et sa position dans le pipeline. Cliquez une ligne pour la fiche détaillée."
      >
        {leads.length === 0 ? (
          <Note>Aucun lead pour l&apos;instant. Lancez une demande depuis le parcours prospect.</Note>
        ) : (
          <DataTable
            columns={["Client", "Trajet", "Date départ", "Pax", "Statut", "Devis", "Relance", "Créé"]}
            columnsTemplate="1.1fr 1.3fr .8fr .4fr 1fr .7fr .7fr .7fr"
            rows={leads.map((lead) => ({
              href: `/dashboard/demandes/${lead.id}`,
              cells: [
                lead.organization ?? lead.email ?? shortId(lead.id),
                <span key="r">
                  {route(lead.departureCity, lead.arrivalCity)}
                  <small className={styles.cellSub}>{tripTypeLabel(lead.tripType)}</small>
                </span>,
                dateOnly(lead.departureDate),
                lead.passengerCount ?? "—",
                <span key="s">
                  <StatusBadge status={lead.status} />
                  {lead.status === "INCOMPLETE" && lead.missingFields.length > 0 ? (
                    <small className={styles.cellSub}>Manque : {lead.missingFields.join(", ")}</small>
                  ) : null}
                  {lead.status === "HUMAN_REVIEW" && lead.humanReviewReason ? (
                    <small className={styles.cellSub}>{lead.humanReviewReason}</small>
                  ) : null}
                </span>,
                euro(lead.quoteAmountTtc),
                dateOnly(lead.nextFollowupAt),
                dateOnly(lead.createdAt),
              ],
            }))}
          />
        )}
      </Panel>
    </main>
  );
}
