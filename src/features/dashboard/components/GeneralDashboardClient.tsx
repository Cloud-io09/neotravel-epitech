"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Bell,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Plus,
  ScrollText,
  Sparkles,
  Target
} from "lucide-react";
import type {
  GeneralDashboardData,
  GeneralHeroMetric,
  GeneralTone
} from "@/features/dashboard/services/getGeneralDashboardData";
import { DashboardSearch } from "./DashboardSearch";
import { StatusBadge } from "./StatusBadge";
import dashStyles from "./dashboard.module.css";
import styles from "./generalDashboard.module.css";

type TabId = "overview" | "actions" | "pipeline" | "activity";

const TABS: Array<{ id: TabId; label: string; icon: typeof Target }> = [
  { id: "overview", label: "Vue d'ensemble", icon: Target },
  { id: "actions", label: "À faire", icon: ClipboardList },
  { id: "pipeline", label: "Pipeline", icon: Inbox },
  { id: "activity", label: "Activité", icon: ScrollText }
];

const toneClass: Record<GeneralTone, string> = {
  blue: styles.toneBlue,
  gold: styles.toneGold,
  red: styles.toneRed,
  green: styles.toneGreen
};

function HeroCard({ metric, onNavigate }: { metric: GeneralHeroMetric; onNavigate?: (tab: TabId) => void }) {
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

  if (metric.href === "#actions") {
    return (
      <button type="button" className={className} onClick={() => onNavigate?.("actions")}>
        {body}
      </button>
    );
  }

  return metric.href ? (
    <Link className={className} href={metric.href}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
  );
}

export function GeneralDashboardClient({ data }: { data: GeneralDashboardData }) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("overview");
  const previewActions = data.actions.slice(0, 5);

  return (
    <main className={dashStyles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Pilotage commercial</p>
          <h1>Vue générale</h1>
          <p>
            Pipeline NeoTravel en un coup d&apos;œil : demandes, devis, relances et actions à reprendre en priorité.
          </p>
        </div>
        <div className={styles.headerAside}>
          <div className={styles.headerActions}>
            <DashboardSearch />
            <Link className={styles.primaryCta} href="/client/demande">
              <Plus size={16} aria-hidden="true" />
              Nouvelle demande
            </Link>
          </div>
          <div className={styles.headerHint}>
            <Sparkles size={16} aria-hidden="true" />
            <span>Les cartes rouges ou orange signalent une action prioritaire.</span>
          </div>
        </div>
      </header>

      <section className={styles.heroGrid} aria-label="Indicateurs prioritaires">
        {data.hero.map((metric) => (
          <HeroCard key={metric.label} metric={metric} onNavigate={setTab} />
        ))}
      </section>

      <div className={styles.tabBar} role="tablist" aria-label="Sections vue générale">
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
              {item.id === "actions" && data.actions.length > 0 ? ` (${data.actions.length})` : ""}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <div className={styles.sourceBadge} data-mode={data.dataMode}>
            <strong>Source données : {data.dataModeLabel}</strong>
            <span>{data.dataMode === "supabase" ? "Données réelles" : "Données demoStore"}</span>
          </div>

          <nav className={styles.pipelineStrip} aria-label="Résumé du pipeline">
            {data.pipelineGroups.map((group) => (
              <Link key={group.label} className={`${styles.pipelineTile} ${toneClass[group.tone]}`} href={group.href}>
                <span>{group.label}</span>
                <strong>{group.value}</strong>
                <small>{group.hint}</small>
              </Link>
            ))}
          </nav>

          <div className={styles.overviewGrid}>
            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <ClipboardList size={18} aria-hidden="true" />
                <div>
                  <h2>À faire maintenant</h2>
                  <p>File priorisée : validation humaine, demandes incomplètes, relances en retard.</p>
                </div>
                {data.actions.length > 0 ? (
                  <button type="button" className={styles.panelLink} onClick={() => setTab("actions")}>
                    Tout voir
                  </button>
                ) : null}
              </div>
              {previewActions.length === 0 ? (
                <div className={styles.empty}>
                  <strong>Aucune action urgente</strong>
                  <span>Les nouvelles demandes et relances apparaîtront ici automatiquement.</span>
                </div>
              ) : (
                <div className={styles.actionPreviewList}>
                  {previewActions.map((action) => (
                    <Link key={action.id} className={styles.actionPreviewRow} href={action.href}>
                      <span>
                        <strong>{action.client}</strong>
                        <small>{action.what}</small>
                      </span>
                      <span className={styles.actionPreviewCta}>
                        {action.cta}
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <article className={styles.panelCard}>
              <div className={styles.panelHead}>
                <LayoutDashboard size={18} aria-hidden="true" />
                <div>
                  <h2>Accès rapides</h2>
                  <p>Espaces de pilotage les plus utilisés.</p>
                </div>
              </div>
              <div className={styles.quickLinks}>
                <Link className={styles.quickLink} href="/dashboard/demandes">
                  <Inbox size={16} aria-hidden="true" /> Demandes
                </Link>
                <Link className={styles.quickLink} href="/dashboard/devis">
                  <FileText size={16} aria-hidden="true" /> Devis
                </Link>
                <Link className={styles.quickLink} href="/dashboard/relances">
                  <Bell size={16} aria-hidden="true" /> Relances
                </Link>
                <Link className={styles.quickLink} href="/dashboard/kpis">
                  <Target size={16} aria-hidden="true" /> KPIs
                </Link>
              </div>
              <div className={styles.sourceBadge} data-mode={data.dataMode} style={{ marginTop: 16, marginBottom: 0 }}>
                <strong>{data.stats.leadsTotal} demandes</strong>
                <span>
                  {data.stats.quotesTotal} devis · {data.stats.quoteVolumeLabel}
                </span>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {tab === "actions" ? (
        <section className={styles.tabPanel} role="tabpanel" id="actions">
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <ClipboardList size={18} aria-hidden="true" />
              <div>
                <h2>File d&apos;actions prioritaires</h2>
                <p>Triée par urgence commerciale — reprenez les dossiers bloquants en premier.</p>
              </div>
            </div>
            {data.actions.length === 0 ? (
              <div className={styles.empty}>
                <strong>Aucune action urgente</strong>
                <span>Les nouvelles demandes, reprises humaines et relances apparaîtront ici automatiquement.</span>
              </div>
            ) : (
              <div className={styles.actionList}>
                {data.actions.map((action) => (
                  <div key={action.id} className={styles.actionRow}>
                    <span>
                      <StatusBadge status={action.status} />
                    </span>
                    <span className={styles.actionInfo}>
                      <strong>{action.client}</strong>
                      <small>{action.what}</small>
                    </span>
                    <Link className={styles.actionCta} href={action.href}>
                      {action.cta}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </article>
        </section>
      ) : null}

      {tab === "pipeline" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <Inbox size={18} aria-hidden="true" />
              <div>
                <h2>Pipeline centralisé</h2>
                <p>Une lecture par demande : statut, devis, relance et prochaine action.</p>
              </div>
              <Link className={styles.panelLink} href="/dashboard/demandes">
                Toutes les demandes
              </Link>
            </div>
            {data.pipelineRows.length === 0 ? (
              <div className={styles.empty}>
                <strong>Aucune demande</strong>
                <span>Créez une première demande pour alimenter le pipeline.</span>
              </div>
            ) : (
              <div className={styles.pipelineTableWrap}>
                <table className={styles.pipelineTable}>
                  <colgroup>
                    <col className={styles.colDossier} />
                    <col className={styles.colTrajet} />
                    <col className={styles.colStatut} />
                    <col className={styles.colAction} />
                    <col className={styles.colDevis} />
                    <col className={styles.colRelance} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Dossier</th>
                      <th scope="col">Trajet</th>
                      <th scope="col">Statut</th>
                      <th scope="col">Prochaine action</th>
                      <th scope="col">Devis</th>
                      <th scope="col">Relance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pipelineRows.map((row) => (
                      <tr
                        key={row.id}
                        className={styles.pipelineTr}
                        tabIndex={0}
                        role="link"
                        onClick={() => router.push(row.href)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            router.push(row.href);
                          }
                        }}
                      >
                        <td>
                          <span className={styles.cellPrimary}>{row.dossier}</span>
                        </td>
                        <td>
                          <span className={styles.cellSecondary}>{row.trajet}</span>
                        </td>
                        <td>
                          <StatusBadge status={row.status} />
                        </td>
                        <td>
                          <span className={styles.nextAction} data-tone={row.actionTone}>
                            <strong>{row.actionLabel}</strong>
                            <small>{row.actionDetail}</small>
                          </span>
                        </td>
                        <td>
                          <span className={styles.cellSecondary}>{row.devis}</span>
                        </td>
                        <td>
                          <span className={styles.cellSecondary}>{row.relance}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </section>
      ) : null}

      {tab === "activity" ? (
        <section className={styles.tabPanel} role="tabpanel">
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <ScrollText size={18} aria-hidden="true" />
              <div>
                <h2>Traçabilité récente</h2>
                <p>Dernières actions système ou commerciales enregistrées.</p>
              </div>
            </div>
            {data.auditRows.length === 0 ? (
              <div className={styles.empty}>
                <strong>Aucun événement</strong>
                <span>Les transitions métier apparaîtront ici au fil des actions.</span>
              </div>
            ) : (
              <div className={styles.auditTable}>
                <div className={styles.auditHead}>
                  <span>Heure</span>
                  <span>Acteur</span>
                  <span>Action</span>
                  <span>Objet</span>
                </div>
                {data.auditRows.map((row) =>
                  row.href ? (
                    <Link key={row.id} className={styles.auditRow} href={row.href}>
                      <span>{row.time}</span>
                      <span>{row.actor}</span>
                      <span>{row.action}</span>
                      <span>{row.entity}</span>
                    </Link>
                  ) : (
                    <div key={row.id} className={styles.auditRow}>
                      <span>{row.time}</span>
                      <span>{row.actor}</span>
                      <span>{row.action}</span>
                      <span>{row.entity}</span>
                    </div>
                  )
                )}
              </div>
            )}
          </article>
        </section>
      ) : null}
    </main>
  );
}
