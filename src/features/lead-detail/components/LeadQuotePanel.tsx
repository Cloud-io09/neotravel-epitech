import Link from "next/link";
import type { Lead } from "@/shared/types/lead";
import { LeadGenerateQuote } from "./LeadGenerateQuote";
import styles from "./lead-detail.module.css";

export function LeadQuotePanel({ lead }: { lead: Lead }) {
 return (
  <section className={styles.sideCard} aria-labelledby="structured-data-title">
   <h2 id="structured-data-title">Données structurées</h2>
   <p>Ces informations sont transmises au moteur de calcul et au dashboard commercial.</p>

   <ul className={styles.dataList}>
    <li>
     Organisation <strong>{lead.organization ?? "À confirmer"}</strong>
    </li>
    <li>
     Email <strong>{lead.email ?? "À confirmer"}</strong>
    </li>
    <li>
     Départ <strong>{lead.departureCity ?? "À confirmer"}</strong>
    </li>
    <li>
     Arrivée <strong>{lead.arrivalCity ?? "À confirmer"}</strong>
    </li>
    <li>
     Date <strong>{lead.departureDate ?? "À confirmer"}</strong>
    </li>
   </ul>

   <div className={styles.cardActions}>
    <LeadGenerateQuote leadId={lead.id} status={lead.status} />
    <Link className={styles.secondary} href="/dashboard/human-review">
     À valider
    </Link>
   </div>
  </section>
 );
}
