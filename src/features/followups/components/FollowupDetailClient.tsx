"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Bell,
  Calendar,
  ClipboardList,
  FileText,
  Mail,
  Route,
  Send,
  Sparkles,
  Target,
  User
} from "lucide-react";
import type { DetailTone, FollowupDetailData, TimelineStep } from "@/features/followups/services/getFollowupDetailData";
import { FollowupSendButton } from "./FollowupSendButton";
import styles from "./followup-detail.module.css";

type TabId = "overview" | "timeline" | "dossier" | "actions";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "overview", label: "Vue d'ensemble", icon: Target },
  { id: "timeline", label: "Timeline", icon: Route },
  { id: "dossier", label: "Dossier", icon: ClipboardList },
  { id: "actions", label: "Actions", icon: Send }
];

const toneClass: Record<DetailTone, string> = {
  blue: styles.toneBlue,
  gold: styles.toneGold,
  red: styles.toneRed,
  green: styles.toneGreen
};

function HeroCard({ metric }: { metric: FollowupDetailData["hero"][number] }) {
  return (
    <article className={`${styles.heroCard} ${toneClass[metric.tone]}`}>
      <span className={styles.heroLabel}>{metric.label}</span>
      <strong className={styles.heroValue}>{metric.value}</strong>
      {metric.detail ? <small className={styles.heroDetail}>{metric.detail}</small> : null}
    </article>
  );
}

function TimelineView({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className={styles.timeline}>
      {steps.map((step) => (
        <article className={styles.step} data-state={step.state} key={step.index}>
          <span className={styles.marker}>{step.index}</span>
          <div className={styles.stepBody}>
            <span className={styles.stepBadge}>{step.badge}</span>
            <strong>{step.title}</strong>
            <p>{step.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function FollowupDetailClient({ data }: { data: FollowupDetailData }) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Relance commerciale</p>
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.backLink} href={data.links.back}>
            <ArrowLeft size={15} aria-hidden="true" />
            Retour relances
          </Link>
          {data.links.lead ? (
            <Link className={styles.secondaryLink} href={data.links.lead}>
              <User size={15} aria-hidden="true" />
              Fiche demande
            </Link>
          ) : null}
          {data.links.quote ? (
            <Link className={styles.secondaryLink} href={data.links.quote}>
              <FileText size={15} aria-hidden="true" />
              Voir devis
            </Link>
          ) : null}
        </div>
      </header>

      <section className={styles.heroGrid} aria-label="Indicateurs relance">
        {data.hero.map((metric) => (
          <HeroCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className={styles.scenarioBanner} data-kind={data.scenario.kind}>
        <Sparkles size={16} aria-hidden="true" />
        <div>
          <strong>{data.scenario.label}</strong>
          <p>{data.scenario.description}</p>
        </div>
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="Sections relance">
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
                <Route size={18} aria-hidden="true" />
                <div>
                  <h2>Parcours de relance</h2>
                  <p>Où en est le dossier dans la séquence.</p>
                </div>
              </div>
              <TimelineView steps={data.timeline} />
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <Bell size={18} aria-hidden="true" />
                <div>
                  <h2>Relances liées</h2>
                  <p>Toutes les relances du même devis.</p>
                </div>
              </div>
              <div className={styles.relatedList}>
                {data.relatedFollowups.map((item) => (
                  <Link
                    key={item.id}
                    className={styles.relatedRow}
                    href={`/dashboard/relances/${item.id}`}
                    data-current={item.isCurrent ? "true" : undefined}
                    data-tone={item.tone}
                  >
                    <div>
                      <strong>{item.statusLabel}</strong>
                      <span>{item.dueAtLabel}</span>
                    </div>
                    {item.isCurrent ? <span className={styles.currentPill}>Actuelle</span> : null}
                  </Link>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "timeline" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <Route size={18} aria-hidden="true" />
              <div>
                <h2>Timeline devis et relances</h2>
                <p>Décision commerciale, relances et sortie de scénario.</p>
              </div>
            </div>
            <TimelineView steps={data.timeline} />
          </article>
        </section>
      ) : null}

      {tab === "dossier" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <ClipboardList size={18} aria-hidden="true" />
              <div>
                <h2>Fiche dossier</h2>
                <p>Informations client et devis pour contextualiser la relance.</p>
              </div>
            </div>
            <div className={styles.dossierGrid}>
              {data.dossier.map((row) => (
                <div className={styles.dossierRow} key={row.label}>
                  <span>{row.label}</span>
                  <strong>{row.value}</strong>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "actions" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.actionsGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <Mail size={18} aria-hidden="true" />
                <div>
                  <h2>Envoi manuel</h2>
                  <p>Déclencher l&apos;email de relance depuis le dashboard.</p>
                </div>
              </div>
              <FollowupSendButton followupId={data.followupId} disabled={!data.canSend} />
              {!data.canSend ? (
                <p className={styles.helpText}>Cette relance a déjà été traitée ou n&apos;est plus programmable.</p>
              ) : null}
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <Calendar size={18} aria-hidden="true" />
                <div>
                  <h2>Raccourcis</h2>
                  <p>Pages utiles pour poursuivre le suivi commercial.</p>
                </div>
              </div>
              <div className={styles.quickLinks}>
                <Link className={styles.quickLink} href={data.links.back}>
                  Planning des relances
                </Link>
                {data.links.lead ? (
                  <Link className={styles.quickLink} href={data.links.lead}>
                    Ouvrir la demande
                  </Link>
                ) : null}
                {data.links.quote ? (
                  <Link className={styles.quickLink} href={data.links.quote}>
                    Consulter le devis client
                  </Link>
                ) : null}
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </main>
  );
}
