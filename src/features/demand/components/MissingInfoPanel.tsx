import styles from "./demand.module.css";

export function MissingInfoPanel() {
  return (
    <section className={styles.card} aria-labelledby="missing-title">
      <h2 id="missing-title">Infos manquantes</h2>
      <div className={styles.chips}>
        <span className={styles.warningChip}>Email contact</span>
        <span className={styles.warningChip}>Horaire depart</span>
      </div>
      <p className={styles.guardrail}>
        Tant que les champs critiques ne sont pas confirmes, la demande reste INCOMPLETE et aucun devis automatique
        n&apos;est produit.
      </p>
    </section>
  );
}
