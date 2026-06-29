"use client";

import { useState } from "react";
import { ClipboardList, ScrollText, ShieldCheck, Target } from "lucide-react";
import type { RgpdAuditDashboardData } from "@/features/dashboard/services/getRgpdAuditDashboardData";
import { AlphaDashboardLayout } from "./AlphaDashboardLayout";
import styles from "./alphaDashboard.module.css";

type TabId = "overview" | "journal" | "conservation";

const TABS = [
  { id: "overview" as const, label: "Vue d'ensemble", icon: Target },
  { id: "journal" as const, label: "Journal", icon: ScrollText },
  { id: "conservation" as const, label: "Conservation", icon: ShieldCheck }
];

export function RgpdAuditDashboardClient({ data }: { data: RgpdAuditDashboardData }) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <AlphaDashboardLayout
      eyebrow="Conformité & traçabilité"
      title="Audit RGPD"
      subtitle="Données minimales, conservation maîtrisée et preuve d'audit sans secret en clair."
      hint="Chaque transition métier clé génère un log avec empreinte d'intégrité."
      hero={data.hero}
      banner={{
        kind: "info",
        label: "Minimisation des données",
        description: "Les secrets, jetons et payloads sensibles ne sont jamais affichés dans l'interface."
      }}
      tabs={TABS}
      activeTab={tab}
      onTabChange={(id) => setTab(id as TabId)}
      note="Minimisation : les secrets ne sont jamais affichés. Audit : chaque transition clé crée un log avec empreinte entrée/sortie."
    >
      {tab === "overview" ? (
        <div className={styles.overviewGrid}>
          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <ScrollText size={18} aria-hidden="true" />
              <div>
                <h2>Derniers événements</h2>
                <p>Aperçu du journal d&apos;audit.</p>
              </div>
            </div>
            {data.auditRows.length === 0 ? (
              <p style={{ color: "#6b7890", fontSize: 13 }}>Aucun événement enregistré.</p>
            ) : (
              <div className={styles.auditTable}>
                <div className={styles.auditHead} style={{ gridTemplateColumns: "0.9fr 0.8fr 1.2fr 0.8fr" }}>
                  <span>Heure</span>
                  <span>Acteur</span>
                  <span>Action</span>
                  <span>Objet</span>
                </div>
                {data.auditRows.slice(0, 6).map((row) => (
                  <div
                    className={styles.auditRow}
                    key={row.id}
                    style={{ gridTemplateColumns: "0.9fr 0.8fr 1.2fr 0.8fr" }}
                  >
                    <span>{row.time}</span>
                    <span>{row.actor}</span>
                    <span>{row.action}</span>
                    <span>{row.entity}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className={styles.panelCard}>
            <div className={styles.panelHead}>
              <ShieldCheck size={18} aria-hidden="true" />
              <div>
                <h2>Politique de conservation</h2>
                <p>Règles appliquées par type de donnée.</p>
              </div>
            </div>
            <div className={styles.jumpList}>
              {data.retention.map((row) => (
                <div key={row.data} className={styles.jumpRow} style={{ cursor: "default" }}>
                  <div>
                    <strong>{row.data}</strong>
                    <span>
                      {row.usage} · {row.retention}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>
      ) : null}

      {tab === "journal" ? (
        <article className={styles.panelCard}>
          <div className={styles.panelHead}>
            <ScrollText size={18} aria-hidden="true" />
            <div>
              <h2>Journal d&apos;audit complet</h2>
              <p>Transitions métier avec acteur et empreinte.</p>
            </div>
          </div>
          <div className={styles.auditTable}>
            <div className={styles.auditHead} style={{ gridTemplateColumns: "0.9fr 0.8fr 1.2fr 0.8fr 0.6fr" }}>
              <span>Heure</span>
              <span>Acteur</span>
              <span>Action</span>
              <span>Objet</span>
              <span>Hash</span>
            </div>
            {data.auditRows.map((row) => (
              <div
                className={styles.auditRow}
                key={row.id}
                style={{ gridTemplateColumns: "0.9fr 0.8fr 1.2fr 0.8fr 0.6fr" }}
              >
                <span>{row.time}</span>
                <span>{row.actor}</span>
                <span>{row.action}</span>
                <span>{row.entity}</span>
                <span>{row.hasHash ? "Oui" : "—"}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {tab === "conservation" ? (
        <article className={styles.panelCard}>
          <div className={styles.panelHead}>
            <ClipboardList size={18} aria-hidden="true" />
            <div>
              <h2>Données & conservation</h2>
              <p>Politique de minimisation appliquée.</p>
            </div>
          </div>
          <div className={styles.auditTable}>
            <div className={styles.auditHead} style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
              <span>Donnée</span>
              <span>Usage</span>
              <span>Conservation</span>
              <span>Base légale</span>
            </div>
            {data.retention.map((row) => (
              <div
                className={styles.auditRow}
                key={row.data}
                style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}
              >
                <span>{row.data}</span>
                <span>{row.usage}</span>
                <span>{row.retention}</span>
                <span>{row.legalBasis}</span>
              </div>
            ))}
          </div>
        </article>
      ) : null}
    </AlphaDashboardLayout>
  );
}
