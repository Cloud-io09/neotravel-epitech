import Link from "next/link";
import type { Lead } from "@/shared/types/lead";
import styles from "./lead-detail.module.css";

export function LeadHeader({ lead }: { lead: Lead }) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.eyebrow}>Parcours pro apres landing</p>
        <h1>Trajet detaillé carte</h1>
        <p>
          La demande qualifiée est transformée en fiche exploitable : route, capacité, données detectées et garde-fous
          avant devis pour {lead.organization ?? "ce prospect"}.
        </p>
      </div>
      <div className={styles.actions}>
        <Link className={styles.secondary} href="/demande">
          Conversation
        </Link>
        <Link className={styles.primary} href="/devis/demo-quote-alpha">
          Voir devis
        </Link>
      </div>
    </header>
  );
}
