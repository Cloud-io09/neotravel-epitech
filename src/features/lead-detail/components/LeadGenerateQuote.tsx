"use client";

import styles from "./lead-detail.module.css";

export function LeadGenerateQuote({ status }: { leadId: string; status: string }) {
 if (status === "HUMAN_REVIEW") {
  return <p className={styles.genHint}>Validation commerciale requise avant devis.</p>;
 }

 if (status === "QUALIFIED" || status === "HIGH_VALUE") {
  return (
   <p className={styles.genHint}>
    Demande qualifiée sans devis : le flux automatique doit créer le devis ou transmettre le dossier en
    validation humaine.
   </p>
  );
 }

 return <p className={styles.genHint}>Le devis sera préparé automatiquement une fois la demande qualifiée.</p>;
}
