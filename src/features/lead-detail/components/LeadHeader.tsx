import Link from "next/link";
import type { Lead } from "@/shared/types/lead";
import styles from "./lead-detail.module.css";

export function LeadHeader({ lead }: { lead: Lead }) {
 return (
  <header className={styles.header}>
   <div>
    <p className={styles.eyebrow}>Parcours commercial</p>
    <h1>Fiche de la demande</h1>
    <p>
     La demande qualifiée devient une fiche exploitable : trajet, capacité, informations détectées et contrôles
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
