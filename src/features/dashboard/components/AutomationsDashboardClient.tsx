"use client";

import { useState } from "react";
import { Cpu, Settings, Target, Workflow } from "lucide-react";
import type { AutomationsDashboardData } from "@/features/dashboard/services/getAutomationsDashboardData";
import { AlphaDashboardLayout } from "./AlphaDashboardLayout";
import { AutomationWorkflowsManager } from "./AutomationWorkflowsManager";
import styles from "./alphaDashboard.module.css";

type TabId = "overview" | "workflows" | "config";

const TABS = [
  { id: "overview" as const, label: "Vue d'ensemble", icon: Target },
  { id: "workflows" as const, label: "Workflows", icon: Workflow },
  { id: "config" as const, label: "Configuration", icon: Settings }
];

export function AutomationsDashboardClient({ data }: { data: AutomationsDashboardData }) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <AlphaDashboardLayout
      eyebrow="Pilotage automatisations"
      title="Automatisations"
      subtitle="Workflows n8n, relances et notifications — orchestration sans impact sur le calcul de prix."
      hint="Les workflows n'envoient jamais de prix : seulement des emails et alertes."
      hero={data.hero}
      banner={{
        kind: data.n8nConnected ? "info" : "warning",
        label: data.n8nConnected ? "n8n connecté" : "Mode simulation",
        description: data.n8nConnected
          ? "Les webhooks n8n sont configurés. Les workflows peuvent déclencher des envois réels."
          : "Aucun webhook n8n détecté : les envois sont simulés et journalisés localement."
      }}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      note="Le prix client reste calculé par calculer_devis() — jamais par un workflow."
    >
      {tab === "overview" ? (
        <div className={styles.overviewGrid}>
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <Workflow size={18} aria-hidden="true" />
              <div>
                <h2>État des flux</h2>
                <p>Volumes actuels liés aux automatisations.</p>
              </div>
            </div>
            <div className={styles.statusList}>
              <div className={styles.statusRow}>
                <span>Statut n8n</span>
                <strong data-tone={data.n8nConnected ? "green" : "red"}>{data.statusLabel}</strong>
              </div>
              <div className={styles.statusRow}>
                <span>Workflows par défaut</span>
                <strong>{data.summary.workflowCount}</strong>
              </div>
              <div className={styles.statusRow}>
                <span>Relances programmées</span>
                <strong data-tone={data.summary.scheduled > 0 ? "gold" : undefined}>{data.summary.scheduled}</strong>
              </div>
              <div className={styles.statusRow}>
                <span>Devis prêts à envoyer</span>
                <strong>{data.summary.quotesReady}</strong>
              </div>
            </div>
          </article>

          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <Cpu size={18} aria-hidden="true" />
              <div>
                <h2>Édition rapide</h2>
                <p>Accédez aux sections de paramétrage.</p>
              </div>
            </div>
            <div className={styles.jumpList}>
              <button type="button" className={styles.jumpRow} onClick={() => setTab("workflows")}>
                <div>
                  <strong>Gérer les workflows</strong>
                  <span>Ajouter, modifier ou supprimer des automatisations locales.</span>
                </div>
              </button>
              <button type="button" className={styles.jumpRow} onClick={() => setTab("config")}>
                <div>
                  <strong>Configuration n8n</strong>
                  <span>Variables d&apos;environnement et webhooks à brancher.</span>
                </div>
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {tab === "workflows" ? (
        <div className={styles.embedded}>
          <AutomationWorkflowsManager workflows={data.workflows} statusLabel={data.statusLabel} />
        </div>
      ) : null}

      {tab === "config" ? (
        <article className={styles.panelCard}>
          <div className={styles.panelHead}>
            <Settings size={18} aria-hidden="true" />
            <div>
              <h2>Variables n8n</h2>
              <p>Configurez ces clés dans .env.local pour activer les envois réels.</p>
            </div>
          </div>
          <ul className={styles.ruleList}>
            <li>
              <code>N8N_CUSTOMER_EMAIL_WEBHOOK</code> — webhook principal emails clients
            </li>
            <li>
              <code>N8N_SEND_QUOTE_WEBHOOK</code> — envoi de devis
            </li>
            <li>
              <code>N8N_FOLLOWUP_WEBHOOK</code> — relances programmées
            </li>
            <li>
              <code>N8N_HUMAN_REVIEW_WEBHOOK</code> — alertes validation humaine
            </li>
            <li>
              <code>N8N_WEBHOOK_SECRET</code> — secret de signature des payloads
            </li>
          </ul>
        </article>
      ) : null}
    </AlphaDashboardLayout>
  );
}
