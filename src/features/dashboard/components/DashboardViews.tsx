import Link from "next/link";
import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import { getModelRuns } from "@/features/admin/services/getModelRuns";
import { getIntegrationsStatus } from "@/features/integrations/integrations";
import { humanReviewReasonLabel } from "@/features/human-review/reasonLabels";
import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import { isLostQuote, isWonQuote, quoteOutcomeDisplay } from "@/features/dashboard/services/quoteOutcome";
import {
 formatCommercialDate,
 getLeadCommercialAction,
 latestQuoteByLeadId,
 leadDisplayName,
 leadRouteLabel,
 nextScheduledFollowup,
 quoteLabel
} from "@/features/dashboard/services/leadPipelinePresentation";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import styles from "./dashboard.module.css";
import { AdminDashboardClient } from "./AdminDashboardClient";
import { AutomationsDashboardClient } from "./AutomationsDashboardClient";
import { getAutomationsDashboardData } from "@/features/dashboard/services/getAutomationsDashboardData";
import { GrowthDashboardClient } from "./GrowthDashboardClient";
import { RgpdAuditDashboardClient } from "./RgpdAuditDashboardClient";
import { getRgpdAuditDashboardData } from "@/features/dashboard/services/getRgpdAuditDashboardData";
import { getAdminDashboardData } from "@/features/dashboard/services/getAdminDashboardData";
import { CardList, DashboardHeader, DataTable, KpiGrid, Note, Panel } from "./DashboardPageKit";
import { KpisDashboardClient } from "./KpisDashboardClient";
import { getKpisDashboardData } from "@/features/dashboard/services/getKpisDashboardData";
import { PricingDashboardClient } from "./PricingDashboardClient";
import { getPricingDashboardData } from "@/features/dashboard/services/getPricingDashboardData";
import { StatusBadge } from "./StatusBadge";

function euro(value: number) {
 return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

const PRIORITY_STATUSES = new Set(["NEW", "INCOMPLETE", "HUMAN_REVIEW"]);
const ARCHIVED_LEAD_STATUSES = new Set<Lead["status"]>(["LOST", "CLOSED"]);
const QUALIFIED_LEAD_STATUSES = new Set<Lead["status"]>([
 "QUALIFIED",
 "HIGH_VALUE",
 "QUOTE_READY",
 "QUOTE_SENT",
 "FOLLOWUP_1",
 "FOLLOWUP_2",
 "FOLLOWUP_SCHEDULED",
 "WON"
]);

function filterLeadsByStatus(leads: Lead[], status?: string) {
 if (status === "incomplete") return leads.filter((lead) => lead.status === "INCOMPLETE" || (lead.missingFields?.length ?? 0) > 0);
 if (status === "urgent") {
  const now = Date.now();
  return leads.filter((lead) => {
   const departureTime = dateTime(lead.departureDate);
   if (departureTime === null) return false;
   const hoursToDeparture = (departureTime - now) / 3_600_000;
   return hoursToDeparture >= 0 && hoursToDeparture < 7 * 24;
  });
 }
 if (status === "qualified") return leads.filter((lead) => QUALIFIED_LEAD_STATUSES.has(lead.status));
 return leads.filter((lead) => !ARCHIVED_LEAD_STATUSES.has(lead.status));
}

type LeadPriorityBucket = {
 rank: number;
 label: string;
 tone: "critical" | "warning" | "info" | "muted";
};

function PriorityBadge({ priority }: { priority: LeadPriorityBucket }) {
 return (
  <span className={styles.priorityBadge} data-tone={priority.tone}>
   {priority.label}
  </span>
 );
}

function leadPriorityBucket(lead: Lead, quote?: Quote): LeadPriorityBucket {
 if (lead.status === "HUMAN_REVIEW") {
  return { rank: 1, label: "1 - À valider urgent", tone: "critical" };
 }

 if (lead.status === "INCOMPLETE" || lead.status === "NEW" || (lead.missingFields?.length ?? 0) > 0) {
  return { rank: 2, label: "2 - À compléter", tone: "warning" };
 }

 if (
  lead.status === "QUOTE_SENT" ||
  lead.status === "FOLLOWUP_SCHEDULED" ||
  lead.status === "FOLLOWUP_1" ||
  lead.status === "FOLLOWUP_2" ||
  quote?.status === "QUOTE_SENT"
 ) {
  return { rank: 3, label: "3 - Envoyé", tone: "info" };
 }

 if (lead.status === "LOST" || lead.status === "CLOSED" || quote?.status === "REFUSED" || quote?.status === "CLOSED") {
  return { rank: 4, label: "4 - Perdu", tone: "muted" };
 }

 return { rank: 5, label: "5 - Autres", tone: "info" };
}

function compareLeadPriority(a: Lead, b: Lead, quoteByLeadId: Map<string, Quote>) {
 const aPriority = leadPriorityBucket(a, quoteByLeadId.get(a.id)).rank;
 const bPriority = leadPriorityBucket(b, quoteByLeadId.get(b.id)).rank;

 if (aPriority !== bPriority) return aPriority - bPriority;

 const aDate = new Date(a.departureDate ?? a.createdAt ?? 0).getTime();
 const bDate = new Date(b.departureDate ?? b.createdAt ?? 0).getTime();
 return aDate - bDate;
}

function filterQuotesByStatus(quotes: Quote[], leadById: Map<string, Lead>, status?: string) {
 if (status === "open") return quotes.filter((quote) => quote.status === "QUOTE_READY" || quote.status === "QUOTE_SENT");
 if (status === "sent") return quotes.filter((quote) => quote.status === "QUOTE_SENT");
 if (status === "accepted") return quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId)));
 if (status === "lost") return quotes.filter((quote) => isLostQuote(quote, leadById.get(quote.leadId)));
 return quotes;
}

function filterFollowupsByStatus(followups: Followup[], status?: string) {
 if (status === "scheduled") return followups.filter((followup) => followup.status === "SCHEDULED");
 if (status !== "overdue") return followups;
 const now = Date.now();
 return followups.filter((followup) => followup.status === "SCHEDULED" && new Date(followup.dueAt).getTime() < now);
}

function dateTime(value: string | null | undefined) {
 if (!value) return null;
 const time = new Date(value).getTime();
 return Number.isFinite(time) ? time : null;
}

export async function KpisDashboardPage() {
 const data = await getKpisDashboardData();
 return <KpisDashboardClient data={data} />;
}

export async function CommercialLeadsPage({ status }: { status?: string }) {
 const [leads, followups, quotes] = await Promise.all([listLeads(), listFollowups(), listQuotes()]);
 const toTreat = leads.filter((lead) => PRIORITY_STATUSES.has(lead.status)).length;
 const archived = leads.filter((lead) => ARCHIVED_LEAD_STATUSES.has(lead.status)).length;
 const quoteByLeadId = latestQuoteByLeadId(quotes);
 const visibleLeads = filterLeadsByStatus(leads, status).sort((a, b) => compareLeadPriority(a, b, quoteByLeadId));

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Demandes"
    subtitle="Tous les prospects, leur statut, la priorité et la prochaine action."
    actionHref="/client/demande"
    actionLabel="Nouvelle demande"
   />
   <KpiGrid
    kpis={[
     { label: "Demandes", value: leads.length, tone: "blue" },
     { label: "À traiter", value: toTreat, tone: "red" },
     { label: "À valider", value: leads.filter((lead) => lead.status === "HUMAN_REVIEW").length, tone: "gold" },
     { label: "Archives", value: archived, tone: "gold" }
    ]}
   />
   <Panel
    title="Toutes les demandes"
    subtitle="Chaque ligne est un dossier commercial : statut, blocage éventuel, devis et prochaine action."
    action={
     <Link className={styles.secondary} href="/dashboard/demandes/archive">
      Voir les archives
     </Link>
    }
   >
    {visibleLeads.length === 0 ? (
     <Note>Aucune demande pour ce filtre.</Note>
    ) : (
     <DataTable
      columns={["Priorité", "Dossier", "Trajet", "Statut", "Prochaine action", "Devis", "Relance"]}
      columnsTemplate="1fr 1.15fr 1.1fr .85fr 1.35fr .9fr .8fr"
      rows={visibleLeads.map((lead) => {
       const quote = quoteByLeadId.get(lead.id);
       const followup = nextScheduledFollowup(lead.id, followups);
       const action = getLeadCommercialAction({ lead, quote, followup });
       const priority = leadPriorityBucket(lead, quote);
       return {
        cells: [
         <PriorityBadge key="priority" priority={priority} />,
         leadDisplayName(lead),
         leadRouteLabel(lead),
         <StatusBadge key="s" status={lead.status} />,
         action.label,
         quoteLabel(quote),
         followup ? formatCommercialDate(followup.dueAt) : "Aucune"
        ],
        href: `/dashboard/demandes/${lead.id}`,
        tone: action.tone === "critical" ? "review" : action.tone === "warning" ? "danger" : undefined
       };
      })}
     />
    )}
   </Panel>
  </main>
 );
}

function archiveReason(lead: Lead, quote?: Quote) {
 if (lead.humanReviewReason) return lead.humanReviewReason;
 if (lead.status === "LOST" || quote?.status === "REFUSED") return "Demande perdue ou refusée.";
 return "Demande clôturée : non traitable ou sans réponse après relances.";
}

export async function ArchivedLeadsPage() {
 const [leads, quotes] = await Promise.all([listLeads(), listQuotes()]);
 const quoteByLeadId = latestQuoteByLeadId(quotes);
 const archivedLeads = leads
  .filter((lead) => ARCHIVED_LEAD_STATUSES.has(lead.status))
  .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime());

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Archives demandes"
    subtitle="Demandes non traitables, perdues ou clôturées après absence de réponse."
    actionHref="/dashboard/demandes"
    actionLabel="Retour demandes"
   />
   <KpiGrid
    kpis={[
     { label: "Archives", value: archivedLeads.length, tone: "gold" },
     { label: "Non traitables", value: archivedLeads.filter((lead) => lead.status === "CLOSED").length, tone: "blue" },
     { label: "Perdues", value: archivedLeads.filter((lead) => lead.status === "LOST").length, tone: "red" },
     { label: "Avec raison", value: archivedLeads.filter((lead) => Boolean(lead.humanReviewReason)).length, tone: "green" }
    ]}
   />
   <Panel
    title="Dossiers archivés"
    subtitle="La raison d'archive reste visible pour éviter de retraiter un dossier non exploitable."
   >
    {archivedLeads.length === 0 ? (
     <Note>Aucune demande archivée.</Note>
    ) : (
     <DataTable
      columns={["Dossier", "Trajet", "Statut", "Raison", "Dernière date"]}
      columnsTemplate="1.1fr 1.1fr .8fr 1.7fr .9fr"
      rows={archivedLeads.map((lead) => {
       const quote = quoteByLeadId.get(lead.id);
       return {
        cells: [
         leadDisplayName(lead),
         leadRouteLabel(lead),
         <StatusBadge key="s" status={lead.status} />,
         archiveReason(lead, quote),
         formatCommercialDate(lead.updatedAt ?? lead.createdAt)
        ],
        href: `/dashboard/demandes/${lead.id}`,
        tone: lead.status === "LOST" ? "danger" : undefined
       };
      })}
     />
    )}
   </Panel>
  </main>
 );
}

export async function HumanReviewDashboardPage() {
 const [leads, quotes] = await Promise.all([listLeads(), listQuotes()]);
 const humanLeads = leads.filter((lead) => lead.status === "HUMAN_REVIEW");

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Validation humaine"
    subtitle="Dossiers repris par un commercial : informations à confirmer, cas urgents ou sensibles."
    actionHref="/dashboard/agenda-commerciaux"
    actionLabel="Voir l'agenda"
   />
   <KpiGrid
    kpis={[
     { label: "À valider", value: humanLeads.length, tone: "red" },
     { label: "Demandes totales", value: leads.length, tone: "blue" },
     { label: "Devis en attente", value: quotes.filter((quote) => quote.status === "QUOTE_READY").length, tone: "gold" },
     {
      label: "Avec date de départ",
      value: humanLeads.filter((lead) => lead.departureDate).length,
      tone: "blue"
     }
    ]}
   />
   <Panel
    title="Dossiers à reprendre"
    subtitle="Chaque dossier ici vient d'un lead passé « À valider ». Il est aussi placé dans l'agenda à sa date de départ."
   >
    {humanLeads.length === 0 ? (
     <Note>
      Aucun dossier à valider. Passez une demande au statut « À valider » depuis sa fiche pour la voir apparaître
      ici et dans l&apos;agenda.
     </Note>
    ) : (
     <DataTable
     columns={["Client", "Trajet", "Raison", "Date de départ", "Action"]}
     columnsTemplate="1.2fr 1fr 1.4fr 1fr .7fr"
     rows={humanLeads.map((lead) => ({
       cells: [
        leadDisplayName(lead),
        leadRouteLabel(lead),
        humanReviewReasonLabel(lead.humanReviewReason),
        lead.departureDate ? new Date(lead.departureDate).toLocaleDateString("fr-FR") : "À préciser",
        "Reprendre"
       ],
       href: `/dashboard/demandes/${lead.id}`,
       tone: "review"
      }))}
     />
    )}
   </Panel>
  </main>
 );
}

export async function QuotesDashboardPage({ status }: { status?: string }) {
 const [quotes, leads] = await Promise.all([listQuotes(), listLeads()]);
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const visibleQuotes = filterQuotesByStatus(quotes, leadById, status);
 const quoteTotal = quotes.reduce((sum, quote) => sum + quote.calculation.priceTtc, 0);
 const acceptedCount = quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId))).length;

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Devis"
    subtitle="Propositions générées, envoyées, acceptées ou refusées. Le prix vient uniquement du moteur de calcul."
   />
   <KpiGrid
    kpis={[
     { label: "Devis", value: quotes.length, tone: "blue" },
     { label: "Envoyés", value: quotes.filter((quote) => quote.status === "QUOTE_SENT").length, tone: "gold" },
     { label: "Acceptés", value: acceptedCount, tone: "green" },
     { label: "CA potentiel", value: euro(quoteTotal), tone: "blue" }
    ]}
   />
   <Panel title="Propositions">
    {visibleQuotes.length === 0 ? (
     <Note>Aucun devis pour ce filtre.</Note>
    ) : (
     <DataTable
      columns={["Devis", "Client", "Montant", "Statut", "Action"]}
      columnsTemplate="1fr 1.2fr .9fr 1fr .8fr"
      rows={visibleQuotes.map((quote) => {
       const lead = leadById.get(quote.leadId);
       const outcome = quoteOutcomeDisplay(quote, lead);
       return {
        cells: [
         quote.calculation.quoteNumber,
         leadDisplayName(lead),
         euro(quote.calculation.priceTtc),
         <StatusBadge key="s" status={outcome.status} />,
         "Ouvrir"
        ],
        href: `/client/devis/${quote.id}`
       };
      })}
     />
    )}
   </Panel>
   <Note>Le PDF et le dashboard affichent le devis existant : ils ne recalculent jamais les montants.</Note>
  </main>
 );
}

export async function FollowupsDashboardPage({ status }: { status?: string }) {
 const [followups, leads] = await Promise.all([listFollowups(), listLeads()]);
 const visibleFollowups = filterFollowupsByStatus(followups, status);
 const leadById = new Map(leads.map((lead) => [lead.id, lead]));
 const scheduled = followups.filter((followup) => followup.status === "SCHEDULED").length;

 return (
  <main className={styles.page}>
   <DashboardHeader title="Relances" subtitle="Planning des relances et de leur statut d'envoi, par demande." />
   <KpiGrid
    kpis={[
     { label: "Relances", value: followups.length, tone: "blue" },
     { label: "Programmées", value: scheduled, tone: "gold" },
     { label: "Envoyées", value: followups.filter((followup) => followup.status !== "SCHEDULED").length, tone: "green" }
    ]}
   />
   <Panel title="Planning des relances" subtitle="Chaque relance apparaît aussi dans l'Agenda à sa date d'échéance.">
    {visibleFollowups.length === 0 ? (
     <Note>Aucune relance pour ce filtre.</Note>
    ) : (
     <DataTable
      columns={["Dossier", "Devis", "Date", "Canal", "Statut"]}
      columnsTemplate="1.2fr 1fr .9fr .8fr 1fr"
      rows={visibleFollowups.map((followup) => {
       const lead = leadById.get(followup.leadId);
       return {
        cells: [
         leadDisplayName(lead),
         followup.quoteId ?? "Devis",
         new Date(followup.dueAt).toLocaleDateString("fr-FR"),
        followup.channel,
        <StatusBadge key="s" status={followup.status} />
       ],
        href: `/dashboard/relances/${followup.id}`
       };
      })}
     />
    )}
   </Panel>
  </main>
 );
}

export async function CostsLogsDashboardPage() {
 const [logs, runs] = await Promise.all([getAuditLogs(), getModelRuns()]);
 const cost = runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0);
 const latency = runs.reduce((sum, run) => sum + (run.latencyMs ?? 0), 0);

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Coûts & logs"
    subtitle="Appels IA, coûts, latence et journal d'audit des transitions métier."
   />
   <KpiGrid
    kpis={[
     { label: "Appels IA", value: runs.length, tone: "blue" },
     { label: "Coût cumulé", value: euro(cost), tone: "green" },
     { label: "Latence cumulée", value: `${latency} ms`, tone: "gold" },
     { label: "Événements d'audit", value: logs.length, tone: "blue" }
    ]}
   />
   <div className={styles.twoGrid}>
    <Panel title="Appels IA" subtitle="Chaque appel IA/mock avec son coût (table model_runs).">
     <DataTable
      columns={["Heure", "Usage", "Modèle", "Coût", "Statut"]}
      columnsTemplate="1fr 1.2fr 1.2fr .8fr .8fr"
      rows={runs.map((run) => ({
       cells: [
        new Date(run.createdAt).toLocaleTimeString("fr-FR"),
        run.purpose,
        run.model,
        euro(run.costEur ?? 0),
        run.status ?? "mock"
       ]
      }))}
     />
    </Panel>
    <Panel title="Journal d'audit" subtitle="Transitions métier tracées avec empreintes (table audit_logs).">
     <DataTable
      columns={["Heure", "Acteur", "Action", "Objet"]}
      columnsTemplate="1fr .8fr 1.4fr 1fr"
      rows={logs.map((log) => ({
       cells: [new Date(log.createdAt).toLocaleTimeString("fr-FR"), log.actor, log.action, log.entityType]
      }))}
     />
    </Panel>
   </div>
  </main>
 );
}

export async function AdminOverviewDashboardPage() {
 const data = await getAdminDashboardData();
 return <AdminDashboardClient data={data} />;
}

export async function PricingDashboardPage() {
 const data = await getPricingDashboardData();
 return <PricingDashboardClient data={data} />;
}

export async function AutomationsDashboardPage() {
 const data = await getAutomationsDashboardData();
 return <AutomationsDashboardClient data={data} />;
}

export async function AdminAiCostsDashboardPage() {
 const runs = await getModelRuns();
 const integrations = getIntegrationsStatus();
 const aiOn = Boolean(integrations.find((integration) => integration.id === "ai")?.connected);
 const cost = runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0);
 const errors = runs.filter((run) => run.status === "error").length;

 return (
  <main className={styles.page}>
   <DashboardHeader
    title="Coûts IA"
    subtitle="Fournisseur, modèle et coûts. Le MVP peut tourner en mock, sans aucun coût."
   />
   <KpiGrid
    kpis={[
     { label: "Fournisseur IA", value: aiOn ? "Connecté" : "Mock", tone: aiOn ? "green" : "gold" },
     { label: "Modèle", value: runs[0]?.model ?? "mock", tone: "blue" },
     { label: "Coût cumulé", value: euro(cost), tone: "green" },
     { label: "Appels en erreur", value: errors, tone: errors > 0 ? "red" : "green" }
    ]}
   />
   <Panel title="Détail des appels" subtitle="Usage, modèle, coût et issue de chaque appel.">
    <DataTable
     columns={["Heure", "Usage", "Modèle", "Coût", "Statut"]}
     columnsTemplate="1fr 1.2fr 1.2fr .8fr .8fr"
     rows={runs.map((run) => ({
      cells: [
       new Date(run.createdAt).toLocaleTimeString("fr-FR"),
       run.purpose,
       run.model,
       euro(run.costEur ?? 0),
       run.status ?? "mock"
      ]
     }))}
    />
   </Panel>
   <Note>En cas d'échec IA ou de cas sensible, le dossier bascule en validation humaine — jamais de décision automatique opaque.</Note>
  </main>
 );
}

export async function RgpdAuditDashboardPage() {
 const data = await getRgpdAuditDashboardData();
 return <RgpdAuditDashboardClient data={data} />;
}

export async function GrowthDashboardPage() {
 return <GrowthDashboardClient />;
}
