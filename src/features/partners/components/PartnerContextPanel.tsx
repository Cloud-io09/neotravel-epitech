import type { Partner } from "./partnerData";
import styles from "./partners.module.css";

export function PartnerContextPanel({ partner }: { partner: Partner | null }) {
  return (
    <section className={styles.card} aria-labelledby="partner-context-title">
      <h2 id="partner-context-title">Contexte partenaire</h2>
      <p>
        L&apos;IA peut suggerer un contexte de preselection, mais elle ne confirme jamais un engagement partenaire ni un
        engagement operationnel.
      </p>
      {partner ? (
        <ul className={styles.infoList}>
          <li>
            Zones <strong>{partner.zones.join(", ")}</strong>
          </li>
          <li>
            Note dossier <strong>{partner.note}</strong>
          </li>
        </ul>
      ) : null}
    </section>
  );
}
