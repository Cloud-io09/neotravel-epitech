"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  ClipboardList,
  FileText,
  Route,
  Send,
  Sparkles,
  Target
} from "lucide-react";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import type {
  LeadDetailPageData,
  LeadDetailTone,
  LeadPipelineStep
} from "@/features/lead-detail/services/getLeadDetailPageData";
import { LeadActivityTimeline } from "@/features/lead-pipeline/components/LeadActivityTimeline";
import { LeadProcessFlow } from "@/features/lead-pipeline/components/LeadProcessFlow";
import type { Followup } from "@/shared/types/followup";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";
import { LeadArchiveAction } from "./LeadArchiveAction";
import { LeadEditForm } from "./LeadEditForm";
import { LeadGenerateQuote } from "./LeadGenerateQuote";
import { LeadMessages } from "./LeadMessages";
import { LeadReviewActions } from "./LeadReviewActions";
import { LeadSendQuoteEmail } from "./LeadSendQuoteEmail";
import styles from "./leadDetailDashboard.module.css";

type TabId = "overview" | "parcours" | "dossier" | "actions";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "overview", label: "Vue d'ensemble", icon: Target },
  { id: "parcours", label: "Parcours", icon: Route },
  { id: "dossier", label: "Dossier", icon: ClipboardList },
  { id: "actions", label: "Actions", icon: Send }
];

const toneClass: Record<LeadDetailTone, string> = {
  blue: styles.toneBlue,
  gold: styles.toneGold,
  red: styles.toneRed,
  green: styles.toneGreen
};

function HeroCard({ metric }: { metric: LeadDetailPageData["hero"][number] }) {
  return (
    <article className={`${styles.heroCard} ${toneClass[metric.tone]}`}>
      <span className={styles.heroLabel}>{metric.label}</span>
      <strong className={styles.heroValue}>{metric.value}</strong>
      {metric.detail ? <small className={styles.heroDetail}>{metric.detail}</small> : null}
    </article>
  );
}

function PipelineTimeline({ steps }: { steps: LeadPipelineStep[] }) {
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

export function LeadDetailClient({
  lead,
  quote,
  followup,
  data
}: {
  lead: Lead;
  quote?: Quote;
  followup?: Followup;
  data: LeadDetailPageData;
}) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Fiche demande</p>
          <h1>{data.title}</h1>
          <p>{data.subtitle}</p>
          <div style={{ marginTop: 10 }}>
            <StatusBadge status={lead.status} />
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.backLink} href={data.links.back}>
            <ArrowLeft size={15} aria-hidden="true" />
            Retour demandes
          </Link>
          {data.links.quote ? (
            <Link className={styles.secondaryLink} href={data.links.quote}>
              <FileText size={15} aria-hidden="true" />
              Voir devis
            </Link>
          ) : null}
          {data.links.followup ? (
            <Link className={styles.secondaryLink} href={data.links.followup}>
              <Bell size={15} aria-hidden="true" />
              Relance
            </Link>
          ) : null}
          <Link className={styles.primaryLink} href={data.action.href}>
            {data.action.cta}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className={styles.heroGrid} aria-label="Indicateurs demande">
        {data.hero.map((metric) => (
          <HeroCard key={metric.label} metric={metric} />
        ))}
      </section>

      <div className={styles.routingBanner} data-kind={data.routing.kind}>
        <Sparkles size={16} aria-hidden="true" />
        <div>
          <strong>{data.routing.label}</strong>
          <p>{data.routing.description}</p>
        </div>
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="Sections fiche demande">
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
                  <h2>Parcours commercial</h2>
                  <p>Étapes du pipeline pour cette demande.</p>
                </div>
              </div>
              <PipelineTimeline steps={data.pipelineSteps} />
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <Target size={18} aria-hidden="true" />
                <div>
                  <h2>Prochaine action</h2>
                  <p>Ce que le commercial doit faire maintenant.</p>
                </div>
              </div>
              <div className={styles.actionCard} data-tone={data.action.tone}>
                <span>Action prioritaire</span>
                <strong>{data.action.label}</strong>
                <p>{data.action.detail}</p>
                <Link className={styles.primaryLink} href={data.action.href}>
                  {data.action.cta}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>

              <div className={styles.dossierGrid} style={{ marginTop: 16 }}>
                {data.dossier.slice(0, 6).map((row) => (
                  <div className={styles.dossierRow} key={row.label}>
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "parcours" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.embeddedBlock}>
            <LeadProcessFlow lead={lead} />
            <LeadActivityTimeline lead={lead} />
          </div>
        </section>
      ) : null}

      {tab === "dossier" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.dossierLayout}>
            <div className={styles.embeddedBlock}>
              <LeadMessages lead={lead} />
              <article className={styles.panelCard}>
                <div className={styles.panelHead}>
                  <ClipboardList size={18} aria-hidden="true" />
                  <div>
                    <h2>Données structurées</h2>
                    <p>Champs enregistrés sur la demande.</p>
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
            </div>
            <LeadEditForm lead={lead} />
          </div>
        </section>
      ) : null}

      {tab === "actions" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.actionsGrid}>
            <div className={styles.embeddedBlock}>
              <LeadReviewActions lead={lead} />

              <article className={styles.panelCard}>
                <div className={styles.panelHead}>
                  <FileText size={18} aria-hidden="true" />
                  <div>
                    <h2>Devis & envoi</h2>
                    <p>Génération et envoi commercial du devis.</p>
                  </div>
                </div>
                <div className={styles.quoteActions}>
                  {quote ? (
                    <>
                      <Link className={styles.secondaryLink} href={`/client/devis/${quote.id}`}>
                        Ouvrir le devis
                      </Link>
                      <LeadSendQuoteEmail quoteId={quote.id} status={quote.status} />
                    </>
                  ) : (
                    <LeadGenerateQuote leadId={lead.id} status={lead.status} />
                  )}
                  {data.links.humanReview ? (
                    <Link className={styles.secondaryLink} href={data.links.humanReview}>
                      File validation humaine
                    </Link>
                  ) : null}
                </div>
              </article>
            </div>

            <LeadArchiveAction lead={lead} />
          </div>
        </section>
      ) : null}
    </main>
  );
}
