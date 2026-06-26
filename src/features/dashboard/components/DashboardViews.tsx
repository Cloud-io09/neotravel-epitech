import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import { getModelRuns } from "@/features/admin/services/getModelRuns";
import { getPricingAdminData } from "@/features/admin/services/getPricingRules";
import {
  getDashboardData,
  type DashboardFollowup,
  type DashboardLead,
} from "@/features/dashboard/services/getDashboardData";
import styles from "./dashboard.module.css";
import { CardList, DashboardHeader, DataTable, KpiGrid, Note, Panel } from "./DashboardPageKit";

function routeOf(lead: DashboardLead) {
  return `${lead.departureCity ?? "?"} > ${lead.arrivalCity ?? "?"}`;
}

function euro(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function nextFollowup(followups: DashboardFollowup[], leadId: string) {
  const followup = followups.find((item) => item.leadId === leadId && item.status === "scheduled");
  if (!followup) return "Stop";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(followup.scheduledAt));
}

export async function CommercialOverviewPage() {
  const { leads, followups } = await getDashboardData();
  const humanLeads = leads.filter((lead) => lead.status === "HUMAN_REVIEW");

  return (
    <main className={styles.page}>
      <DashboardHeader title="Dashboard commercial" subtitle="KPIs, pipeline, relances et human review." actionHref="/demande" actionLabel="Nouveau lead" />
      <KpiGrid
        kpis={[
          { label: "Leads", value: leads.length, tone: "blue" },
          { label: "A completer", value: leads.filter((lead) => lead.status === "INCOMPLETE").length, tone: "gold" },
          { label: "Human review", value: humanLeads.length, tone: "red" },
          { label: "Cout IA", value: "0,00 EUR", tone: "green" }
        ]}
      />
      <div className={styles.grid}>
        <Panel title="Pipeline rapide" subtitle="Le dashboard reste actionnable : prochain dossier, relance, statut et decision.">
          <DataTable
            columns={["Client", "Trajet", "Statut", "Relance"]}
            columnsTemplate="1.3fr 1fr 1fr .8fr"
            rows={leads.slice(0, 6).map((lead) => ({
              cells: [lead.organization ?? "A completer", routeOf(lead), lead.status, nextFollowup(followups, lead.id)],
              href: `/dashboard/demandes/${lead.id}`
            }))}
          />
        </Panel>
        <aside className={styles.sideStack}>
          <Panel title="Human review" subtitle={`${humanLeads.length} dossiers exigent une reprise commerciale.`}>
            <CardList
              items={[
                { title: "Route hors bareme", body: "Prix non engageant, commercial requis.", tone: "red" },
                { title: "Prompt injection", body: "Garde-fou active, aucun prix par IA.", tone: "red" }
              ]}
            />
          </Panel>
          <Panel title="Relances" subtitle={`${followups.length} relances programmees ou envoyees.`}>
            <CardList items={[{ title: "Regle v12", body: "Urgent J+2, standard J+3/J+7, maximum 2.", tone: "gold" }]} />
          </Panel>
          <Note>Nouveau / A completer / Devis envoye / Accepte / Refuse / Human review / Priorite / Prochaine relance.</Note>
        </aside>
      </div>
    </main>
  );
}

export async function CommercialLeadsPage() {
  const { leads, followups } = await getDashboardData();

  return (
    <main className={styles.page}>
      <DashboardHeader title="Leads commerciaux" subtitle="Tous les prospects, leur statut, la priorite et la prochaine action." actionHref="/demande" actionLabel="Nouveau lead" />
      <Panel title="Tous les leads" subtitle="Les cas complexes restent en human review, les demandes completes avancent vers devis et relances.">
        <DataTable
          columns={["Client", "Trajet", "Statut", "Priorite", "Prochaine relance", "IA"]}
          columnsTemplate="1.2fr 1fr 1fr .8fr 1fr .6fr"
          rows={leads.map((lead) => ({
            cells: [
              lead.organization ?? "Organisation manquante",
              routeOf(lead),
              lead.status,
              lead.status === "HUMAN_REVIEW" ? "Urgent" : "Normale",
              nextFollowup(followups, lead.id),
              "—"
            ],
            href: `/dashboard/demandes/${lead.id}`
          }))}
        />
      </Panel>
    </main>
  );
}

export async function HumanReviewDashboardPage() {
  const { leads } = await getDashboardData();
  const humanLeads = leads.filter((lead) => lead.status === "HUMAN_REVIEW");

  return (
    <main className={styles.page}>
      <DashboardHeader title="Human review" subtitle="Dossiers hors automatisme : incoherence, urgence, prompt injection ou remise manuelle." actionHref="/dashboard/agenda-commerciaux" actionLabel="Voir agenda" />
      <div className={styles.threeGrid}>
        <Panel title="Route hors bareme">
          <CardList items={[{ title: "Controle obligatoire", body: "Distance ou partenaire a valider avant tout engagement.", tone: "red" }]} />
        </Panel>
        <Panel title="Infos incoherentes">
          <CardList items={[{ title: "Questions prospect", body: "Le commercial reprend le contexte avant devis.", tone: "gold" }]} />
        </Panel>
        <Panel title="Prompt injection">
          <CardList items={[{ title: "Garde-fou v12", body: "Pas de remise ni pricing influence par le prompt.", tone: "red" }]} />
        </Panel>
      </div>
      <div className={styles.grid}>
        <Panel title="Dossiers a reprendre">
          <DataTable
            columns={["Lead", "Raison", "Priorite", "Commercial", "Action"]}
            rows={humanLeads.map((lead) => ({
              cells: [lead.organization ?? lead.id, lead.humanReviewReason ?? "Reprise humaine", "Haute", "A assigner", "Ouvrir"],
              href: `/dashboard/demandes/${lead.id}`
            }))}
          />
        </Panel>
        <Panel title="Devis manuel human review" subtitle="Remise exceptionnelle visible, mais pas de recalcul prix dans interface.">
          <CardList
            items={[
              { title: "Montant calculé", body: "Issu de calculer_devis().", tone: "blue" },
              { title: "Remise exceptionnelle", body: "Trace commerciale obligatoire.", tone: "gold" },
              { title: "Prix final", body: "Validation humaine + audit log.", tone: "green" }
            ]}
          />
        </Panel>
      </div>
    </main>
  );
}

export async function QuotesDashboardPage() {
  const { leads, quotes } = await getDashboardData();
  const quoteTotal = quotes.reduce((sum, quote) => sum + quote.priceTtc, 0);

  return (
    <main className={styles.page}>
      <DashboardHeader title="Devis commerciaux" subtitle="Propositions envoyees, acceptees, refusees et PDF. Le prix vient uniquement du moteur deterministe." />
      <KpiGrid
        kpis={[
          { label: "Devis", value: quotes.length, tone: "blue" },
          { label: "Envoyes", value: quotes.filter((quote) => quote.status === "QUOTE_SENT").length, tone: "gold" },
          { label: "Clotures", value: quotes.filter((quote) => quote.status === "CLOSED").length, tone: "green" },
          { label: "CA potentiel", value: euro(quoteTotal), tone: "blue" }
        ]}
      />
      <Panel title="Propositions">
        <DataTable
          columns={["Quote", "Client", "Montant", "Statut", "PDF", "Action"]}
          columnsTemplate="1fr 1.1fr .8fr .9fr .7fr .8fr"
          rows={quotes.map((quote) => {
            const lead = leads.find((item) => item.id === quote.leadId);
            return {
              cells: [quote.quoteNumber, lead?.organization ?? quote.leadId ?? "—", euro(quote.priceTtc), quote.status, "Pret", "Ouvrir"],
              href: `/client/devis/${quote.id}`
            };
          })}
        />
      </Panel>
      <Note>Controle v12 : PDF et dashboard affichent le devis existant, ils ne recalculent jamais les montants.</Note>
    </main>
  );
}

export async function FollowupsDashboardPage() {
  const { leads, followups } = await getDashboardData();

  return (
    <main className={styles.page}>
      <DashboardHeader title="Relances commerciales" subtitle="Planning relances, statut n8n et simulation email pour la soutenance." />
      <div className={styles.grid}>
        <Panel title="Planning relances">
          <DataTable
            columns={["Lead", "Declencheur", "Date", "Canal", "Statut"]}
            rows={followups.map((followup) => {
              const lead = leads.find((item) => item.id === followup.leadId);
              return {
                cells: [lead?.organization ?? followup.leadId ?? "—", followup.quoteId ?? "—", new Date(followup.scheduledAt).toLocaleDateString("fr-FR"), followup.channel, followup.status]
              };
            })}
          />
        </Panel>
        <aside className={styles.sideStack}>
          <Panel title="n8n cloud" subtitle="n8n sert uniquement emails, notifications et relances.">
            <CardList items={[{ title: "Payload webhook", body: "quote_id, email, preview, scheduled_at.", tone: "blue" }]} />
          </Panel>
          <Panel title="Simulation email" subtitle="Mode demo rapide possible, regle reelle documentee.">
            <CardList items={[{ title: "DEMO_FAST_FOLLOWUP", body: "+2 minutes pour la soutenance.", tone: "gold" }]} />
          </Panel>
        </aside>
      </div>
    </main>
  );
}

export async function CostsLogsDashboardPage() {
  const [logs, runs] = await Promise.all([getAuditLogs(), getModelRuns()]);

  return (
    <main className={styles.page}>
      <DashboardHeader title="Couts et logs" subtitle="Runs IA/mock, couts, audit logs et tracabilite des transitions metier." />
      <KpiGrid
        kpis={[
          { label: "Appels IA", value: runs.length, tone: "blue" },
          { label: "Cout jour", value: euro(runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0)), tone: "green" },
          { label: "Latence", value: `${runs.reduce((sum, run) => sum + (run.latencyMs ?? 0), 0)} ms`, tone: "gold" },
          { label: "Audit logs", value: logs.length, tone: "blue" }
        ]}
      />
      <Panel title="model_runs + audit_logs">
        <DataTable
          columns={["Heure", "Type", "Objet", "Tokens/Cout", "Statut"]}
          rows={[
            ...runs.map((run) => ({ cells: [new Date(run.createdAt).toLocaleTimeString("fr-FR"), run.purpose, run.model, euro(run.costEur ?? 0), run.status ?? "mock"] })),
            ...logs.map((log) => ({ cells: [new Date(log.createdAt).toLocaleTimeString("fr-FR"), log.actor, log.action, log.entityType, log.entityId] }))
          ]}
        />
      </Panel>
    </main>
  );
}

export function AdminOverviewDashboardPage() {
  return (
    <main className={styles.page}>
      <DashboardHeader title="Admin vue" subtitle="Pilotage technique du MVP : architecture, devis deterministe, controle humain et evenements systeme." />
      <KpiGrid
        kpis={[
          { label: "Uptime demo", value: "OK", tone: "green" },
          { label: "Cout mois cible", value: "< 500 EUR", tone: "blue" },
          { label: "Erreurs n8n", value: "0", tone: "green" },
          { label: "Alerts RGPD", value: "0", tone: "green" }
        ]}
      />
      <div className={styles.threeGrid}>
        <Panel title="Architecture full cloud">
          <CardList items={[{ title: "Next.js + Supabase + n8n", body: "Stack aligner v12, deployable Vercel.", tone: "blue" }]} />
        </Panel>
        <Panel title="Devis deterministe">
          <CardList items={[{ title: "calculer_devis()", body: "Prix jamais calculé par IA.", tone: "green" }]} />
        </Panel>
        <Panel title="Controle humain">
          <CardList items={[{ title: "HUMAN_REVIEW", body: "Cas complexes, sensibles ou incertains.", tone: "red" }]} />
        </Panel>
      </div>
      <Note>Cette page est une vue de supervision MVP. Elle ne remplace pas une console exploitation production.</Note>
    </main>
  );
}

export function TeamRolesDashboardPage() {
  const team = [
    ["Yves", "Admin", "Complet", "Actif"],
    ["Colin", "Commercial", "Dossiers", "Actif"],
    ["Claudio", "Reservation", "Partenaires", "Actif"],
    ["Alexi", "Observateur", "Lecture", "Demo"]
  ];

  return (
    <main className={styles.page}>
      <DashboardHeader title="Equipe roles" subtitle="Vue indicative des acces et responsabilites. Auth complete hors scope MVP." />
      <div className={styles.grid}>
        <Panel title="Membres equipe">
          <DataTable columns={["Nom", "Role", "Acces", "Statut"]} columnsTemplate="1fr 1fr 1fr 1fr" rows={team.map((cells) => ({ cells }))} />
        </Panel>
        <aside className={styles.sideStack}>
          <Panel title="Roles" subtitle="Admin, commercial, reservation et lecture demo.">
            <Note>Pas de gestion RBAC production dans ce MVP.</Note>
          </Panel>
          <Panel title="Securite" subtitle="Aucun secret affiche, logs nettoyes, audit conserve.">
            <Note>Les droits reels devront passer par auth Supabase en production.</Note>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

export async function PricingDashboardPage() {
  const { pricingRules, routePricing } = await getPricingAdminData();

  return (
    <main className={styles.page}>
      <DashboardHeader title="Pricing" subtitle="Matrices tarifaires et routes de demo. Toute modification future doit etre testee et auditee." />
      <Panel title="Matrices tarifaires">
        <DataTable
          columns={["Regle", "Base", "Option", "Version", "Tests"]}
          rows={[
            ...pricingRules.slice(0, 6).map((rule) => ({ cells: [rule.label, String(rule.value), rule.unit, rule.version, "OK"] })),
            ...routePricing.slice(0, 4).map((route) => ({ cells: [`${route.departureCity} > ${route.arrivalCity}`, "pricing_matrices", `${route.distanceKm ?? "?"} km`, route.version, route.active ? "OK" : "À vérifier"] }))
          ]}
        />
      </Panel>
      <div className={styles.twoGrid}>
        <Note>Autorise : lire les matrices, documenter leur version, verifier les tests pricing.</Note>
        <Note>Interdit : laisser IA, n8n, le PDF ou le dashboard recalculer le prix.</Note>
      </div>
    </main>
  );
}

export function AutomationsDashboardPage() {
  const workflows = [
    ["send_quote", "QUOTE_READY", "email devis", "Actif demo"],
    ["followup_J2", "urgent traitable", "relance", "Actif demo"],
    ["followup_J3", "standard", "relance", "Actif demo"],
    ["followup_J7", "silence", "derniere relance", "Actif demo"],
    ["human_review_notify", "HUMAN_REVIEW", "notification", "Prepare"]
  ];

  return (
    <main className={styles.page}>
      <DashboardHeader title="Automatisations" subtitle="Workflows n8n autorises : emails, notifications et relances uniquement." />
      <Panel title="Workflows n8n">
        <DataTable columns={["Workflow", "Declencheur", "Action", "Statut"]} columnsTemplate="1fr 1fr 1fr 1fr" rows={workflows.map((cells) => ({ cells }))} />
      </Panel>
      <Note>Back-office seulement : n8n ne calcule jamais le prix, ne modifie jamais le devis, ne cloture pas hors regle v12.</Note>
    </main>
  );
}

export async function AdminAiCostsDashboardPage() {
  const runs = await getModelRuns();

  return (
    <main className={styles.page}>
      <DashboardHeader title="Couts IA admin" subtitle="Configuration IA, budget et fallback. Le MVP peut fonctionner en mock/demo." />
      <KpiGrid
        kpis={[
          { label: "Modele", value: runs[0]?.model ?? "mock", tone: "blue" },
          { label: "Budget mois", value: "< 500 EUR", tone: "green" },
          { label: "Cout jour", value: euro(runs.reduce((sum, run) => sum + (run.costEur ?? 0), 0)), tone: "green" },
          { label: "Runs erreur", value: runs.filter((run) => run.status === "error").length, tone: "red" }
        ]}
      />
      <Panel title="Configuration IA">
        <DataTable
          columns={["Usage", "Modele", "Max tokens", "Fallback", "Log"]}
          rows={runs.map((run) => ({ cells: [run.purpose, run.model, "cadre prompt", "human_review", run.status ?? "mock"] }))}
        />
      </Panel>
    </main>
  );
}

export function RgpdAuditDashboardPage() {
  return (
    <main className={styles.page}>
      <DashboardHeader title="RGPD audit" subtitle="Donnees minimales, retention indicative et preuve d'audit sans secrets en clair." />
      <Panel title="Donnees & retention">
        <DataTable
          columns={["Donnee", "Usage", "Retention", "Base"]}
          rows={[
            { cells: ["Email prospect", "devis + relance", "MVP demo", "interet legitime"] },
            { cells: ["Message brut", "qualification", "limitee", "execution demande"] },
            { cells: ["Hashes", "preuve audit", "longue", "integrite"] },
            { cells: ["Payload n8n", "notification", "nettoye", "operationnel"] }
          ]}
        />
      </Panel>
      <div className={styles.twoGrid}>
        <Note>Minimisation : les secrets et tokens ne sont jamais affiches dans admin.</Note>
        <Note>Audit : les transitions importantes creent des logs avec hash entree/sortie.</Note>
      </div>
    </main>
  );
}

export async function GrowthDashboardPage() {
  const { leads, quotes } = await getDashboardData();
  const quoteTotal = quotes.reduce((sum, quote) => sum + quote.priceTtc, 0);

  return (
    <main className={styles.page}>
      <DashboardHeader title="Croissance" subtitle="Vue directionnelle pour relier automatisation, conversion et charge commerciale." />
      <KpiGrid
        kpis={[
          { label: "Demandes", value: leads.length, tone: "blue" },
          { label: "CA estime", value: euro(quoteTotal), tone: "green" },
          { label: "Benefice net", value: euro(Math.round(quoteTotal * 0.15)), tone: "green" },
          { label: "ROI auto.", value: "Demo", tone: "gold" }
        ]}
      />
      <div className={styles.twoGrid}>
        <Panel title="Evolution mensuelle">
          <div className={styles.chart}>
            {[38, 56, 72, 64, 84, 96].map((height) => (
              <span className={styles.bar} style={{ height }} key={height} />
            ))}
          </div>
        </Panel>
        <Panel title="Funnel commercial">
          <div className={styles.chart}>
            {[120, 90, 72, 44, 28].map((height, index) => (
              <span className={index > 2 ? styles.barGold : styles.bar} style={{ height }} key={height} />
            ))}
          </div>
        </Panel>
      </div>
      <Note>Insight direction : le gain doit etre presente comme du temps libere pour les cas complexes, pas comme une reduction effectif.</Note>
    </main>
  );
}

export function CommercialAgendaDashboardPage() {
  return (
    <main className={styles.page}>
      <DashboardHeader title="Agenda commerciaux human review" subtitle="Vue indicative de charge pour router les reprises humaines. Pas de planning RH production." />
      <KpiGrid
        kpis={[
          { label: "Disponibles", value: 4, tone: "green" },
          { label: "Occupes", value: 2, tone: "gold" },
          { label: "Absents", value: 1, tone: "red" },
          { label: "Charge moyenne", value: "62%", tone: "blue" }
        ]}
      />
      <div className={styles.grid}>
        <Panel title="Commerciaux human review">
          <DataTable
            columns={["Nom", "Statut", "Charge", "Competence"]}
            columnsTemplate="1fr 1fr 1fr 1fr"
            rows={[
              { cells: ["Yves", "Dispo", "42%", "Pricing"] },
              { cells: ["Colin", "Occupe", "78%", "Relances"] },
              { cells: ["Claudio", "Dispo", "55%", "Partenaires"] },
              { cells: ["Alexi", "Absent", "0%", "Support"] }
            ]}
          />
        </Panel>
        <Panel title="Planning indicatif">
          <div className={styles.calendar}>
            <strong>Agent</strong>
            <strong>09h</strong>
            <strong>10h</strong>
            <strong>11h</strong>
            <strong>14h</strong>
            <strong>15h</strong>
            {["Yves", "Colin", "Claudio", "Alexi"].flatMap((name, row) => [
              <strong key={`${name}-name`}>{name}</strong>,
              ...["D", "V", "D", row === 1 ? "O" : "D", row === 3 ? "A" : "D"].map((value, index) => <span key={`${name}-${index}`}>{value}</span>)
            ])}
          </div>
        </Panel>
      </div>
      <Note>Routage : assigner au commercial disponible le plus pertinent, puis conserver la decision en audit log.</Note>
    </main>
  );
}
