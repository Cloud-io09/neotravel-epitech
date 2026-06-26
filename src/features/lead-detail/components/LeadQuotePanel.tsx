import Link from "next/link";
import type { Lead } from "@/shared/types/lead";
import styles from "./lead-detail.module.css";

export function LeadQuotePanel({ lead }: { lead: Lead }) {
  return (
    <section className={styles.sideCard} aria-labelledby="structured-data-title">
      <h2 id="structured-data-title">Donnees structurees</h2>
      <p>Ces champs sont ceux transmis au moteur de pricing et au dashboard commercial.</p>

      <ul className={styles.dataList}>
        <li>
          Organisation <strong>{lead.organization ?? "A confirmer"}</strong>
        </li>
        <li>
          Email <strong>{lead.email ?? "A confirmer"}</strong>
        </li>
        <li>
          Depart <strong>{lead.departureCity ?? "A confirmer"}</strong>
        </li>
        <li>
          Arrivee <strong>{lead.arrivalCity ?? "A confirmer"}</strong>
        </li>
        <li>
          Date <strong>{lead.departureDate ?? "A confirmer"}</strong>
        </li>
      </ul>

      <div className={styles.cardActions}>
        <Link className={styles.primary} href="/devis/demo-quote-alpha">
          Generer devis
        </Link>
        <Link className={styles.secondary} href="/dashboard/human-review">
          Human review
        </Link>
      </div>
    </section>
  );
}
