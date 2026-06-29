"use client";

import { useState } from "react";
import {
  Calculator,
  Database,
  Grid3x3,
  Percent,
  ShieldCheck,
  Sparkles,
  Target
} from "lucide-react";
import type { PricingDashboardData, PricingHeroMetric, PricingTone } from "@/features/dashboard/services/getPricingDashboardData";
import { DashboardSearch } from "./DashboardSearch";
import { PricingSettingsEditor, type PricingEditorSection } from "./PricingSettingsEditor";
import dashStyles from "./dashboard.module.css";
import styles from "./pricingDashboard.module.css";

type TabId = "overview" | "grid" | "coefficients" | "fiscal";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "overview", label: "Vue d'ensemble", icon: Target },
  { id: "grid", label: "Grille distance", icon: Grid3x3 },
  { id: "coefficients", label: "Coefficients", icon: Percent },
  { id: "fiscal", label: "Options & fiscalité", icon: Calculator }
];

const toneClass: Record<PricingTone, string> = {
  blue: styles.toneBlue,
  gold: styles.toneGold,
  red: styles.toneRed,
  green: styles.toneGreen
};

function HeroCard({ metric }: { metric: PricingHeroMetric }) {
  return (
    <article className={`${styles.heroCard} ${toneClass[metric.tone]}`}>
      <span className={styles.heroLabel}>{metric.label}</span>
      <strong className={styles.heroValue}>{metric.value}</strong>
      {metric.detail ? <small className={styles.heroDetail}>{metric.detail}</small> : null}
    </article>
  );
}

const JUMP_SECTIONS: Array<{ tab: TabId; label: string; description: string }> = [
  { tab: "grid", label: "Grille forfaitaire", description: "Paliers distance et tarif longue distance" },
  { tab: "coefficients", label: "Coefficients", description: "Saisonnalité, délai et capacité véhicule" },
  { tab: "fiscal", label: "Options & fiscalité", description: "Suppléments, marge commerciale et TVA" }
];

export function PricingDashboardClient({
  data
}: {
  data: PricingDashboardData;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const { summary } = data;
  const editorSection: PricingEditorSection = tab === "overview" ? "none" : tab;

  return (
    <main className={dashStyles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Moteur de tarification</p>
          <h1>Tarification</h1>
          <p>
            Paramétrez la matrice utilisée par <code>calculer_devis()</code>. Les changements s&apos;appliquent aux
            prochains devis.
          </p>
        </div>
        <div className={styles.headerAside}>
          <DashboardSearch />
          <div className={styles.headerHint}>
            <Sparkles size={16} aria-hidden="true" />
            <span>Le prix client reste déterministe — jamais généré par l&apos;IA.</span>
          </div>
        </div>
      </header>

      <section className={styles.heroGrid} aria-label="Indicateurs tarification">
        {data.hero.map((metric) => (
          <HeroCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className={styles.tabBar} role="tablist" aria-label="Sections tarification">
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
                <Database size={18} aria-hidden="true" />
                <div>
                  <h2>Matrice active</h2>
                  <p>Valeurs chargées par le moteur de devis.</p>
                </div>
              </div>
              <div className={styles.statusList}>
                <div className={styles.statusRow}>
                  <span>Version</span>
                  <strong>{summary.version}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Persistance</span>
                  <strong data-tone={summary.isSupabase ? "green" : "gold"}>{summary.storageLabel}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Paliers grille</span>
                  <strong>{summary.gridTiers}</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Plafond grille</span>
                  <strong>
                    {summary.maxGridKm} km · {summary.maxGridPrice} €
                  </strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Longue distance</span>
                  <strong>{summary.longDistanceRate} €/km</strong>
                </div>
                <div className={styles.statusRow}>
                  <span>Guide / chauffeur</span>
                  <strong>
                    {summary.guideDayRate} €/j · {summary.driverNightRate} €/nuit
                  </strong>
                </div>
              </div>
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <ShieldCheck size={18} aria-hidden="true" />
                <div>
                  <h2>Édition rapide</h2>
                  <p>Accédez directement aux sections de paramétrage.</p>
                </div>
              </div>
              <div className={styles.jumpList}>
                {JUMP_SECTIONS.map((item) => (
                  <button key={item.tab} type="button" className={styles.jumpRow} onClick={() => setTab(item.tab)}>
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </article>
          </div>

          <article className={styles.panelCard} style={{ marginTop: 16 }}>
            <div className={styles.panelHead}>
              <Calculator size={18} aria-hidden="true" />
              <div>
                <h2>Règles métier</h2>
                <p>Principes appliqués à chaque calcul de devis.</p>
              </div>
            </div>
            <ul className={styles.ruleList}>
              <li>
                Le montant client provient uniquement de <code>calculer_devis()</code>, jamais d&apos;une estimation IA.
              </li>
              <li>La grille forfaitaire s&apos;applique jusqu&apos;au dernier palier, puis le tarif kilométrique prend le relais.</li>
              <li>Les coefficients saison, délai et capacité s&apos;additionnent avant marge et TVA.</li>
              <li>Marge actuelle : {summary.marginPercent} · TVA transport : {summary.vatPercent}.</li>
            </ul>
          </article>
        </section>
      ) : null}

      <div className={styles.editorWrap}>
        <PricingSettingsEditor
          initialRules={data.rules}
          storageMode={data.storageMode}
          section={editorSection}
        />
      </div>

      <p className={dashStyles.note}>
        Le prix client reste calculé de façon déterministe — jamais par l&apos;IA.
      </p>
    </main>
  );
}
