"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Cpu,
  Database,
  FileText,
  Gauge,
  Inbox,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import type { AdminDashboardData, AdminHeroMetric, AdminTone } from "@/features/dashboard/services/getAdminDashboardData";
import { DashboardSearch } from "./DashboardSearch";
import dashStyles from "./dashboard.module.css";
import styles from "./adminDashboard.module.css";

type TabId = "overview" | "activite" | "systeme" | "audit";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "overview", label: "Vue d'ensemble", icon: Target },
  { id: "activite", label: "Activité", icon: Activity },
  { id: "systeme", label: "Système", icon: Cpu },
  { id: "audit", label: "Audit", icon: ScrollText }
];

const toneClass: Record<AdminTone, string> = {
  blue: styles.toneBlue,
  gold: styles.toneGold,
  red: styles.toneRed,
  green: styles.toneGreen
};

function HeroCard({ metric }: { metric: AdminHeroMetric }) {
  const body = (
    <>
      <span className={styles.heroLabel}>{metric.label}</span>
      <strong className={styles.heroValue}>{metric.value}</strong>
      {metric.detail ? <small className={styles.heroDetail}>{metric.detail}</small> : null}
      {metric.href ? (
        <span className={styles.heroLink}>
          Ouvrir <ArrowRight size={14} aria-hidden="true" />
        </span>
      ) : null}
    </>
  );

  const className = `${styles.heroCard} ${toneClass[metric.tone]}`;

  return metric.href ? (
    <Link className={className} href={metric.href}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
  );
}

function MetricTile({
  label,
  value,
  detail,
  href,
  tone = "blue"
}: {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
  tone?: AdminTone;
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </>
  );

  const className = `${styles.metricTile} ${toneClass[tone]}`;

  return href ? (
    <Link className={className} href={href}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

export function AdminDashboardClient({ data }: { data: AdminDashboardData }) {
  const [tab, setTab] = useState<TabId>("overview");
  const { activite, systeme } = data;

  return (
    <main className={dashStyles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Pilotage administrateur</p>
          <h1>Vue admin</h1>
          <p>Supervision en direct : activité commerciale, système, coûts IA et traçabilité.</p>
        </div>
        <div className={styles.headerAside}>
          <DashboardSearch />
          <div className={styles.headerHint}>
            <Sparkles size={16} aria-hidden="true" />
            <span>Les indicateurs rouges signalent une action prioritaire.</span>
          </div>
        </div>
      </header>

      <section className={styles.heroGrid} aria-label="Indicateurs admin prioritaires">
        {data.hero.map((metric) => (
          <HeroCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className={styles.tabBar} role="tablist" aria-label="Sections vue admin">
        {TABS.map((item) => {
          const Icon = item.icon;
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={styles.tabButton}
              data-active={selected ? "true" : undefined}
              onClick={() => setTab(item.id)}
            >
              <Icon size={15} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.overviewGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <Gauge size={18} aria-hidden="true" />
                <div>
                  <h2>Raccourcis admin</h2>
                  <p>Accès direct aux espaces de pilotage.</p>
                </div>
              </div>
              <div className={styles.shortcutList}>
                {data.shortcuts.map((item) => (
                  <Link key={item.href} className={styles.shortcutRow} href={item.href}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <Database size={18} aria-hidden="true" />
                <div>
                  <h2>État système</h2>
                  <p>Source de données et intégrations.</p>
                </div>
              </div>
              <div className={styles.statusList}>
                <div className={styles.statusRow}>
                  <span>Données</span>
                  <strong data-tone={systeme.isSupabase ? "green" : "gold"}>{systeme.isSupabase ? "Supabase" : "Démo"}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>n8n</span>
                  <strong data-tone={systeme.n8nConnected ? "green" : "gold"}>
                    {systeme.n8nConnected ? "Connecté" : "Simulé"}
                  </strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Coût IA</span>
                  <strong>{systeme.aiCostLabel}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Intégrations</span>
                  <strong>{systeme.integrationsCount}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "activite" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.metricGrid}>
            <MetricTile
              label="Demandes"
              value={activite.leadsTotal}
              detail={`${activite.toTreat} à traiter`}
              href="/dashboard/demandes"
              tone={activite.toTreat > 0 ? "red" : "blue"}
            />
            <MetricTile
              label="Validation humaine"
              value={activite.humanReview}
              href="/dashboard/human-review"
              tone={activite.humanReview > 0 ? "gold" : "green"}
            />
            <MetricTile
              label="Devis"
              value={activite.quotesTotal}
              detail={`${activite.quotesSent} envoyés · ${activite.quotesAccepted} acceptés`}
              href="/dashboard/devis"
              tone="blue"
            />
            <MetricTile
              label="Relances"
              value={activite.followupsTotal}
              detail={`${activite.followupsScheduled} planifiées`}
              href="/dashboard/relances"
              tone="gold"
            />
            <MetricTile
              label="Relances en retard"
              value={activite.followupsOverdue}
              href="/dashboard/relances?status=overdue"
              tone={activite.followupsOverdue > 0 ? "red" : "green"}
            />
          </div>

          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <Inbox size={18} aria-hidden="true" />
              <div>
                <h2>Liens rapides activité</h2>
              </div>
            </div>
            <div className={styles.quickLinks}>
              <Link className={styles.quickLink} href="/dashboard/demandes">
                <Inbox size={16} /> Demandes
              </Link>
              <Link className={styles.quickLink} href="/dashboard/devis">
                <FileText size={16} /> Devis
              </Link>
              <Link className={styles.quickLink} href="/dashboard/relances">
                <Bell size={16} /> Relances
              </Link>
              <Link className={styles.quickLink} href="/dashboard/agenda-commerciaux">
                <Target size={16} /> Agenda
              </Link>
            </div>
          </article>
        </section>
      ) : null}

      {tab === "systeme" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.metricGrid}>
            <MetricTile label="Mode données" value={systeme.dataMode} tone={systeme.isSupabase ? "green" : "gold"} />
            <MetricTile label="Appels IA" value={systeme.aiCalls} href="/dashboard/couts-ia-admin" tone="blue" />
            <MetricTile label="Coût IA cumulé" value={systeme.aiCostLabel} tone="gold" />
            <MetricTile
              label="n8n"
              value={systeme.n8nConnected ? "Actif" : "Simulé"}
              tone={systeme.n8nConnected ? "green" : "gold"}
            />
          </div>

          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <h2>Règles métier</h2>
                <p>Principes de fonctionnement du moteur.</p>
              </div>
            </div>
            <ul className={styles.ruleList}>
              <li>Le prix client vient uniquement de <code>calculer_devis()</code>, jamais de l&apos;IA.</li>
              <li>Les cas sensibles passent en validation humaine avant envoi.</li>
              <li>Les tarifs sont modifiables depuis l&apos;onglet Tarification.</li>
            </ul>
          </article>
        </section>
      ) : null}

      {tab === "audit" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <ScrollText size={18} aria-hidden="true" />
              <div>
                <h2>Journal d&apos;audit récent</h2>
                <p>Dernières transitions métier enregistrées.</p>
              </div>
              <Link className={styles.panelLink} href="/dashboard/couts-logs">
                Tout voir
              </Link>
            </div>
            {data.audit.length === 0 ? (
              <p className={styles.empty}>Aucun événement d&apos;audit pour le moment.</p>
            ) : (
              <div className={styles.auditTable}>
                <div className={styles.auditHead}>
                  <span>Heure</span>
                  <span>Acteur</span>
                  <span>Action</span>
                  <span>Entité</span>
                </div>
                {data.audit.map((row) => (
                  <div className={styles.auditRow} key={row.id}>
                    <span>{row.time}</span>
                    <span>{row.actor}</span>
                    <span>{row.action}</span>
                    <span>{row.entity}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}

      <p className={dashStyles.note}>
        Le prix vient uniquement de calculer_devis() ; les cas sensibles passent en validation humaine.
      </p>
    </main>
  );
}
