import styles from "./adminPricing.module.css";

type RoutePricing = {
 routeKey: string;
 departureCity: string;
 arrivalCity: string;
 distanceKm: number | null;
 basePriceEur: number;
 active: boolean;
 version: string | number;
};

export function RoutePricingTable({ routes }: { routes: RoutePricing[] }) {
 return (
  <section className={styles.panel} aria-labelledby="route-pricing-title">
   <div className={styles.panelHeader}>
    <h2 id="route-pricing-title">route_pricing</h2>
    <p>Distances controlees de demonstration. Elles ne constituent pas une base exhaustive officielle.</p>
   </div>
   <div className={styles.table}>
    <div className={styles.routesHead}>
     <span>Trajet</span>
     <span>Distance</span>
     <span>Base demo</span>
     <span>Version</span>
     <span>Statut</span>
    </div>
    {routes.map((route) => (
     <div className={styles.routesRow} key={`${route.routeKey}-${route.version}`}>
      <span>
       <strong>
        {route.departureCity} &gt; {route.arrivalCity}
       </strong>
       <small>{route.routeKey}</small>
      </span>
      <span>{route.distanceKm ? `${route.distanceKm} km` : "A confirmer"}</span>
      <span>{route.basePriceEur} EUR</span>
      <span>v{route.version}</span>
      <span className={route.active ? styles.active : styles.inactive}>{route.active ? "active" : "inactive"}</span>
     </div>
    ))}
   </div>
  </section>
 );
}
