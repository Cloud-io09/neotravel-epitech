"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  FileText,
  Inbox,
  Sparkles,
  Target,
  TrendingUp
} from "lucide-react";
import type { KpiMetric, KpiTone, KpisDashboardData } from "@/features/dashboard/services/getKpisDashboardData";
import { DashboardSearch } from "./DashboardSearch";
import dashStyles from "./dashboard.module.css";
import styles from "./kpisDashboard.module.css";

type TabId = "overview" | "demandes" | "devis" | "relances" | "analyse";

const TABS: Array<{ id: TabId; label: string; icon: typeof Inbox }> = [
  { id: "overview", label: "Vue d'ensemble", icon: Target },
  { id: "demandes", label: "Demandes", icon: Inbox },
  { id: "devis", label: "Devis", icon: FileText },
  { id: "relances", label: "Relances", icon: Bell },
  { id: "analyse", label: "Analyse", icon: BarChart3 }
];

const toneClass: Record<KpiTone, string> = {
  blue: styles.toneBlue,
  gold: styles.toneGold,
  red: styles.toneRed,
  green: styles.toneGreen
};

function HeroCard({ metric }: { metric: KpiMetric }) {
  const body = (
    <>
      <span className={styles.heroLabel}>{metric.label}</span>
      <strong className={styles.heroValue}>{metric.value}</strong>
      {metric.detail ? <small className={styles.heroDetail}>{metric.detail}</small> : null}
      {metric.href ? (
        <span className={styles.heroLink}>
          Voir <ArrowRight size={14} aria-hidden="true" />
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

function MetricCard({ metric }: { metric: KpiMetric }) {
  const content = (
    <>
      <span className={styles.metricLabel}>{metric.label}</span>
      <strong className={styles.metricValue}>{metric.value}</strong>
      {metric.detail ? <small className={styles.metricDetail}>{metric.detail}</small> : null}
    </>
  );

  const className = `${styles.metricCard} ${toneClass[metric.tone]}`;

  return metric.href ? (
    <Link className={className} href={metric.href} key={metric.label}>
      {content}
    </Link>
  ) : (
    <article className={className} key={metric.label}>
      {content}
    </article>
  );
}

function FunnelChart({ steps }: { steps: KpisDashboardData["funnel"] }) {
  const max = Math.max(...steps.map((step) => step.value), 1);

  return (
    <div className={styles.funnel} aria-label="Entonnoir commercial">
      {steps.map((step, index) => {
        const width = Math.max(18, Math.round((step.value / max) * 100));
        return (
          <div className={styles.funnelRow} key={step.label}>
            <div className={styles.funnelMeta}>
              <span>{step.label}</span>
              <strong>{step.value}</strong>
            </div>
            <div className={styles.funnelTrack}>
              <div
                className={`${styles.funnelBar} ${toneClass[step.tone]}`}
                style={{ width: `${width}%` }}
                data-step={index + 1}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConversionChart({ buckets }: { buckets: KpisDashboardData["analyse"]["conversionEvolution"] }) {
  const activeBuckets = buckets.filter((bucket) => bucket.sent > 0 || bucket.accepted > 0);
  const display = activeBuckets.length > 0 ? activeBuckets : buckets.slice(-6);

  return (
    <div className={styles.conversionChart} role="img" aria-label="Évolution mensuelle du taux de conversion">
      <div className={styles.conversionBars}>
        {display.map((bucket) => (
          <div className={styles.conversionCol} key={bucket.key}>
            <div className={styles.conversionBarWrap}>
              <div className={styles.conversionBar} style={{ height: `${Math.max(bucket.rate, 4)}%` }}>
                <span>{bucket.rate}%</span>
              </div>
            </div>
            <small>{bucket.label}</small>
            <span className={styles.conversionVol}>
              {bucket.accepted}/{bucket.sent}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function KpisDashboardClient({ data }: { data: KpisDashboardData }) {
  const [tab, setTab] = useState<TabId>("overview");

  const tabMetrics: Record<Exclude<TabId, "overview" | "analyse">, KpiMetric[]> = {
    demandes: data.demandes,
    devis: data.devis,
    relances: data.relances
  };

  return (
    <main className={dashStyles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Pilotage commercial</p>
          <h1>KPIs</h1>
          <p>Vos indicateurs essentiels en un coup d&apos;œil — priorisez l&apos;action commerciale.</p>
        </div>
        <div className={styles.headerAside}>
          <DashboardSearch />
          <div className={styles.headerHint}>
            <Sparkles size={16} aria-hidden="true" />
            <span>Les cartes rouges ou orange demandent une action rapide.</span>
          </div>
        </div>
      </header>

      <section className={styles.heroGrid} aria-label="KPIs prioritaires commerciaux">
        {data.hero.map((metric) => (
          <HeroCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className={styles.tabBar} role="tablist" aria-label="Sections KPI">
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
                <TrendingUp size={18} aria-hidden="true" />
                <div>
                  <h2>Entonnoir commercial</h2>
                  <p>De la demande reçue au devis gagné.</p>
                </div>
              </div>
              <FunnelChart steps={data.funnel} />
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <AlertTriangle size={18} aria-hidden="true" />
                <div>
                  <h2>Actions du jour</h2>
                  <p>Accès direct aux dossiers à traiter.</p>
                </div>
              </div>
              <div className={styles.actionList}>
                {data.hero.map((metric) =>
                  metric.href ? (
                    <Link key={metric.label} className={styles.actionRow} href={metric.href} data-tone={metric.tone}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  ) : null
                )}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "demandes" || tab === "devis" || tab === "relances" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.metricGrid}>
            {tabMetrics[tab].map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </section>
      ) : null}

      {tab === "analyse" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.analyseGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <BarChart3 size={18} aria-hidden="true" />
                <div>
                  <h2>Évolution conversion</h2>
                  <p>Devis acceptés / devis envoyés, par mois.</p>
                </div>
              </div>
              <ConversionChart buckets={data.analyse.conversionEvolution} />
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <Sparkles size={18} aria-hidden="true" />
                <div>
                  <h2>Traitement des demandes</h2>
                  <p>Répartition flux automatisé vs reprise humaine.</p>
                </div>
              </div>
              <div className={styles.splitHero}>
                <div>
                  <span>Flux automatisé</span>
                  <strong>{data.analyse.aiManagedRate}</strong>
                  <small>
                    {data.analyse.aiManagedLeads} dossier(s) sur {data.analyse.handledLeads} traités
                  </small>
                </div>
              </div>
              <div className={styles.splitGrid}>
                <div className={styles.splitItem} data-tone="blue">
                  <strong>{data.analyse.aiManagedLeads}</strong>
                  <span>Automatisé</span>
                </div>
                <div className={styles.splitItem} data-tone="gold">
                  <strong>{data.analyse.humanManagedLeads}</strong>
                  <span>Humain</span>
                </div>
                <div className={styles.splitItem} data-tone="red">
                  <strong>{data.analyse.blockedLeads}</strong>
                  <span>Incomplet</span>
                </div>
                <div className={styles.splitItem} data-tone="green">
                  <strong>{data.analyse.newLeads}</strong>
                  <span>Nouveau</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </main>
  );
}
