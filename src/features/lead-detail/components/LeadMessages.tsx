import type { Lead } from "@/shared/types/lead";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import { LeadRouteMap } from "./LeadRouteMap";
import styles from "./lead-detail.module.css";

export function LeadMessages({ lead }: { lead: Lead }) {
 const confidenceValue = lead.confidence;
 const confidence = typeof confidenceValue === "number" ? Math.round(confidenceValue * 100) : null;

 return (
  <section className={styles.mapCard} aria-labelledby="route-map-title">
   <div className={styles.mapHeader}>
    <div>
     <h2 id="route-map-title">Trajet détecté</h2>
     <p>{lead.rawMessage}</p>
    </div>
    <span className={styles.confidence}>{confidence === null ? "Fiabilite a confirmer" : `${confidence}% fiable`}</span>
   </div>

   <LeadRouteMap departureCity={lead.departureCity} arrivalCity={lead.arrivalCity} />

   <div className={styles.metrics}>
    <div className={styles.metric}>
     <span>Passagers</span>
     <strong>{lead.passengerCount ?? "À confirmer"}</strong>
    </div>
    <div className={styles.metric}>
     <span>Options</span>
     <strong>{lead.options.length ? lead.options.join(", ") : "Aucune"}</strong>
    </div>
    <div className={styles.metric}>
     <span>Statut</span>
     <StatusBadge status={lead.status} />
    </div>
   </div>
  </section>
 );
}
