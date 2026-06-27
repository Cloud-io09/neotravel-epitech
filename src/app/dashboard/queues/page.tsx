import { getPipelineData } from "@/features/dashboard/services/getPipelineData";
import { DashboardHeader, DataTable, Note, Panel } from "@/features/dashboard/components/DashboardPageKit";
import { dateOnly, route, shortId } from "@/features/dashboard/components/pipelineFormat";
import styles from "@/features/dashboard/components/dashboard.module.css";

export const dynamic = "force-dynamic";

export default async function QueuesPage() {
  const { leads, followups } = await getPipelineData();

  const incomplete = leads.filter((lead) => lead.status === "INCOMPLETE");
  const humanReview = leads.filter((lead) => lead.status === "HUMAN_REVIEW");
  const pendingFollowups = followups.filter((followup) => followup.status === "scheduled");
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  return (
    <main className={styles.page}>
      <DashboardHeader
        title="Files d'attente"
        subtitle="Ce qui bloque ou attend une action : demandes incomplètes, validation humaine, relances à venir."
      />

      <Panel
        title="Demandes incomplètes"
        subtitle="Bloquées avant devis tant que des champs critiques manquent."
      >
        {incomplete.length === 0 ? (
          <Note>Aucune demande incomplète.</Note>
        ) : (
          <DataTable
            columns={["Client", "Trajet", "Champs manquants", "Créé"]}
            columnsTemplate="1fr 1.2fr 1.6fr .7fr"
            rows={incomplete.map((lead) => ({
              href: `/dashboard/demandes/${lead.id}`,
              cells: [
                lead.organization ?? lead.email ?? shortId(lead.id),
                route(lead.departureCity, lead.arrivalCity),
                lead.missingFields.length ? lead.missingFields.join(", ") : "—",
                dateOnly(lead.createdAt),
              ],
            }))}
          />
        )}
      </Panel>

      <Panel
        title="Validation humaine"
        subtitle="Cas complexes ou sensibles escaladés : aucun devis automatique tant qu'un humain n'a pas tranché."
      >
        {humanReview.length === 0 ? (
          <Note>Aucun dossier en validation humaine.</Note>
        ) : (
          <DataTable
            columns={["Client", "Trajet", "Raison", "Créé"]}
            columnsTemplate="1fr 1.2fr 1.6fr .7fr"
            rows={humanReview.map((lead) => ({
              href: `/dashboard/demandes/${lead.id}`,
              cells: [
                lead.organization ?? lead.email ?? shortId(lead.id),
                route(lead.departureCity, lead.arrivalCity),
                lead.humanReviewReason ?? "—",
                dateOnly(lead.createdAt),
              ],
            }))}
          />
        )}
      </Panel>

      <Panel
        title="Relances à venir"
        subtitle="Relances programmées (simulées via n8n) en attente d'échéance."
      >
        {pendingFollowups.length === 0 ? (
          <Note>Aucune relance programmée.</Note>
        ) : (
          <DataTable
            columns={["Client", "Trajet", "Canal", "Échéance"]}
            columnsTemplate="1fr 1.2fr .7fr .8fr"
            rows={pendingFollowups.map((followup) => {
              const lead = followup.leadId ? leadById.get(followup.leadId) : undefined;
              return {
                href: lead ? `/dashboard/demandes/${lead.id}` : undefined,
                cells: [
                  lead?.organization ?? lead?.email ?? shortId(followup.leadId),
                  lead ? route(lead.departureCity, lead.arrivalCity) : "—",
                  followup.channel,
                  dateOnly(followup.scheduledAt),
                ],
              };
            })}
          />
        )}
      </Panel>
    </main>
  );
}
