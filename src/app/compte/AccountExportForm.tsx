"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import styles from "./account.module.css";

type ExportId = "demandes" | "devis" | "messages";

const options: Array<{ id: ExportId; title: string; body: string }> = [
  {
    id: "demandes",
    title: "Demandes de transport",
    body: "Inclure les trajets, dates, passagers, options et statuts visibles client."
  },
  {
    id: "devis",
    title: "Devis et documents PDF",
    body: "Inclure les references, statuts, montants et documents rattaches."
  },
  {
    id: "messages",
    title: "Messages et relances",
    body: "Inclure l'historique des echanges, notifications et preferences de contact."
  }
];

const exportData: Record<ExportId, unknown> = {
  demandes: [
    { reference: "NT-DMD-2406", trajet: "Paris -> Lyon", statut: "Devis pret", date: "12/07/2026" },
    { reference: "NT-DMD-2405", trajet: "Lille -> Bruxelles", statut: "En qualification", date: "18/07/2026" },
    { reference: "NT-DMD-2399", trajet: "Nantes -> Bordeaux", statut: "Cloture", date: "04/06/2026" }
  ],
  devis: [
    { reference: "DEV-2026-042", trajet: "Paris -> Lyon", montant: "2 640 EUR TTC", statut: "A valider" },
    { reference: "DEV-2026-037", trajet: "Nantes -> Bordeaux", montant: "1 880 EUR TTC", statut: "Accepte" }
  ],
  messages: [
    {
      emetteur: "Conseiller NeoTravel",
      message: "Votre devis Paris -> Lyon est pret. Confirmez les horaires souhaites avant validation definitive."
    },
    {
      emetteur: "Systeme NeoTravel",
      message: "Une relance automatique est programmee. Vous pouvez la suspendre depuis Notifications."
    }
  ]
};

export function AccountExportForm() {
  const [selected, setSelected] = useState<Record<ExportId, boolean>>({
    demandes: true,
    devis: true,
    messages: true
  });
  const [status, setStatus] = useState("3 rubriques selectionnees.");

  const selectedIds = useMemo(() => options.filter((option) => selected[option.id]).map((option) => option.id), [selected]);

  function toggle(id: ExportId) {
    setSelected((current) => {
      const next = { ...current, [id]: !current[id] };
      const count = options.filter((option) => next[option.id]).length;
      setStatus(count ? `${count} rubrique${count > 1 ? "s" : ""} selectionnee${count > 1 ? "s" : ""}.` : "Selectionnez au moins une rubrique.");
      return next;
    });
  }

  function downloadActivity() {
    if (selectedIds.length === 0) {
      setStatus("Selectionnez au moins une rubrique avant de telecharger.");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      account: {
        contact: "Claire Martin",
        organization: "Association scolaire Alpha",
        email: "client@neotravel.fr"
      },
      selections: selectedIds,
      data: Object.fromEntries(selectedIds.map((id) => [id, exportData[id]]))
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "neotravel-activite-client.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus(`Export genere avec ${selectedIds.length} rubrique${selectedIds.length > 1 ? "s" : ""}.`);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2>Extraction d'activite</h2>
        <Download aria-hidden="true" />
      </div>
      <p className={styles.note}>
        L'export regroupe les donnees disponibles dans votre espace client : demandes, devis, messages, preferences et
        actions rattachees au compte. En production, il sera genere depuis les donnees enregistrees dans Supabase.
      </p>
      <div className={styles.stack}>
        {options.map((option) => (
          <label className={styles.toggleRow} key={option.id}>
            <span>
              <strong>{option.title}</strong>
              <small>{option.body}</small>
            </span>
            <input type="checkbox" checked={selected[option.id]} onChange={() => toggle(option.id)} />
          </label>
        ))}
      </div>
      <div className={styles.exportActions}>
        <button className={styles.primaryButton} type="button" onClick={downloadActivity} disabled={selectedIds.length === 0}>
          Telecharger mon activite
        </button>
        <p className={styles.exportStatus}>{status}</p>
      </div>
      <p className={styles.note}>
        Certaines donnees peuvent etre absentes de l'export si elles ont ete supprimees, anonymisees ou conservees
        uniquement pour une obligation legale.
      </p>
    </section>
  );
}
