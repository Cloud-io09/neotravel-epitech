import { PricingRulesEditor } from "@/features/admin/components/PricingRulesEditor";
import { RoutePricingTable } from "@/features/admin/components/RoutePricingTable";
import styles from "@/features/admin/components/adminPricing.module.css";
import { getPricingAdminData } from "@/features/admin/services/getPricingRules";
import { PRICING_MATRIX_VERSION } from "@/shared/lib/pricing";

export default async function PricingPage() {
 const { pricingRules, routePricing } = await getPricingAdminData();

 return (
  <main className={styles.page}>
   <header className={styles.header}>
    <div>
     <h1>Admin pricing</h1>
     <p>
      Consultation des matrices tarifaires. Le montant client reste calcule uniquement par calculerDevis(), jamais
      par cette interface.
     </p>
    </div>
    <span className={styles.badge}>Matrice {PRICING_MATRIX_VERSION}</span>
   </header>

   <p className={styles.notice}>
    Edition temps reel des regles desactivee pour le MVP. Une modification post-MVP devra passer par validation,
    tests pricing et audit log.
   </p>

   <div className={styles.grid}>
    <PricingRulesEditor rules={pricingRules} />
    <RoutePricingTable routes={routePricing} />
   </div>
  </main>
 );
}
