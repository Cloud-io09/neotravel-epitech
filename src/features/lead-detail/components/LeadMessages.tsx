import type { Lead } from "@/shared/types/lead";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import { LeadRouteMap } from "./LeadRouteMap";
import styles from "./lead-detail.module.css";

export function LeadMessages({ lead }: { lead: Lead }) {
 const stops = lead.intermediateStops ?? [];
 const routeLabel =
  lead.departureCity && lead.arrivalCity
   ? [lead.departureCity, ...stops, lead.arrivalCity].join(" → ")
   : "Trajet à compléter";
 const baseTripType =
  lead.tripType === "round_trip"
   ? "Aller-retour"
   : lead.tripType === "one_way"
    ? "Aller simple"
    : "À confirmer";
 const tripTypeLabel =
  lead.hasIntermediateStop || stops.length > 0 ? `${baseTripType} · avec arrêts` : baseTripType;

 return (
  <section className={styles.mapCard} aria-labelledby="route-map-title">
   <div className={styles.mapHeader}>
    <div>
     <h2 id="route-map-title">Résumé de la demande</h2>
     <p className={styles.routeTitle}>{routeLabel}</p>
    </div>
   </div>

   <LeadRouteMap
    key={`${lead.departureCity ?? ""}__${lead.arrivalCity ?? ""}`}
    departureCity={lead.departureCity}
    arrivalCity={lead.arrivalCity}
   />

   <div className={styles.metrics}>
    <div className={styles.metric}>
     <span>Passagers</span>
     <strong>{lead.passengerCount ?? "À confirmer"}</strong>
    </div>
    <div className={styles.metric}>
     <span>Type de trajet</span>
     <strong>{tripTypeLabel}</strong>
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
