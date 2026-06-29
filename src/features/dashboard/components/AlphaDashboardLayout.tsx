"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { DashboardSearch } from "./DashboardSearch";
import dashStyles from "./dashboard.module.css";
import styles from "./alphaDashboard.module.css";

export type AlphaTone = "blue" | "gold" | "red" | "green";

export type AlphaMetric = {
  label: string;
  value: string | number;
  detail?: string;
  tone: AlphaTone;
  href?: string;
};

const toneClass: Record<AlphaTone, string> = {
  blue: styles.toneBlue,
  gold: styles.toneGold,
  red: styles.toneRed,
  green: styles.toneGreen
};

export function AlphaHeroCard({ metric }: { metric: AlphaMetric }) {
  const body = (
    <>
      <span className={styles.heroLabel}>{metric.label}</span>
      <strong className={styles.heroValue}>{metric.value}</strong>
      {metric.detail ? <small className={styles.heroDetail}>{metric.detail}</small> : null}
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

export function AlphaDashboardLayout({
  eyebrow,
  title,
  subtitle,
  hint,
  hero,
  banner,
  tabs,
  activeTab,
  onTabChange,
  children,
  note
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  hint: string;
  hero: AlphaMetric[];
  banner?: { kind?: "info" | "warning" | "critical"; label: string; description: string };
  tabs: Array<{ id: string; label: string; icon: LucideIcon }>;
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
  note?: string;
}) {
  return (
    <main className={dashStyles.page}>
      <div className={styles.page}>
        <header className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>
              {eyebrow}
              <span className={styles.alphaBadge}>Alpha</span>
            </p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className={styles.headerAside}>
            <DashboardSearch />
            <div className={styles.headerHint}>
              <Sparkles size={16} aria-hidden="true" />
              <span>{hint}</span>
            </div>
          </div>
        </header>

        <section className={styles.heroGrid} aria-label={`Indicateurs ${title}`}>
          {hero.map((metric) => (
            <AlphaHeroCard key={metric.label} metric={metric} />
          ))}
        </section>

        {banner ? (
          <div
            className={styles.banner}
            data-kind={banner.kind === "info" ? undefined : banner.kind}
          >
            <Sparkles size={16} aria-hidden="true" />
            <div>
              <strong>{banner.label}</strong>
              <p>{banner.description}</p>
            </div>
          </div>
        ) : null}

        <div className={styles.tabBar} role="tablist" aria-label={`Sections ${title}`}>
          {tabs.map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={styles.tabButton}
                data-active={selected ? "true" : undefined}
                onClick={() => onTabChange(item.id)}
              >
                <Icon size={15} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className={styles.tabPanel}>{children}</div>

        {note ? <p className={dashStyles.note}>{note}</p> : null}
      </div>
    </main>
  );
}
