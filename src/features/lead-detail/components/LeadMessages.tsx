import type { Lead } from "@/shared/types/lead";
import styles from "./lead-detail.module.css";

function formatDate(value: string | null) {
  if (!value) return "A confirmer";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

export function LeadMessages({ lead }: { lead: Lead }) {
  const confidence = Math.round((lead.confidence ?? 0) * 100);

  return (
    <section className={styles.mapCard} aria-labelledby="route-map-title">
      <div className={styles.mapHeader}>
        <div>
          <h2 id="route-map-title">Route detectee</h2>
          <p>{lead.rawMessage}</p>
        </div>
        <span className={styles.confidence}>{confidence}% fiable</span>
      </div>

      <div className={styles.map} aria-label="Carte stylisee du trajet">
        <div className={styles.routeLine} />
        <div className={`${styles.city} ${styles.departure}`}>
          <strong>{lead.departureCity ?? "Depart a confirmer"}</strong>
          <span>Depart · {formatDate(lead.departureDate)}</span>
        </div>
        <div className={`${styles.city} ${styles.arrival}`}>
          <strong>{lead.arrivalCity ?? "Arrivee a confirmer"}</strong>
          <span>Arrivee · {lead.tripType === "round_trip" ? "aller-retour" : "aller simple"}</span>
        </div>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Passagers</span>
          <strong>{lead.passengerCount ?? "A confirmer"}</strong>
        </div>
        <div className={styles.metric}>
          <span>Options</span>
          <strong>{lead.options.length ? lead.options.join(", ") : "Aucune"}</strong>
        </div>
        <div className={styles.metric}>
          <span>Statut</span>
          <strong>{lead.status}</strong>
        </div>
      </div>
    </section>
  );
}
