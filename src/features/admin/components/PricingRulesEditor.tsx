import styles from "./adminPricing.module.css";

type PricingRule = {
 key: string;
 ruleType: string;
 label: string;
 value: unknown;
 unit: string;
 active: boolean;
 version: number;
 metadata?: Record<string, unknown>;
};

function formatValue(value: unknown, unit: string) {
 if (typeof value !== "number") return String(value);
 if (unit === "rate") return `${Math.round(value * 100)} %`;
 if (unit.startsWith("eur")) return `${value} EUR`;
 return String(value);
}

function sourceLabel(metadata?: Record<string, unknown>) {
 const source = metadata?.source;
 return typeof source === "string" ? source : "non renseignee";
}

export function PricingRulesEditor({ rules }: { rules: PricingRule[] }) {
 return (
  <section className={styles.panel} aria-labelledby="pricing-rules-title">
   <div className={styles.panelHeader}>
    <h2 id="pricing-rules-title">pricing_rules</h2>
    <p>Regles consultables. Edition desactivee pour le MVP afin de proteger le calcul deterministe.</p>
   </div>
   <div className={styles.table}>
    <div className={styles.rulesHead}>
     <span>Cle</span>
     <span>Type</span>
     <span>Valeur</span>
     <span>Version</span>
     <span>Statut</span>
     <span>Source</span>
    </div>
    {rules.map((rule) => (
     <div className={styles.rulesRow} key={`${rule.key}-${rule.version}`}>
      <span>
       <strong>{rule.label}</strong>
       <small>{rule.key}</small>
      </span>
      <span>{rule.ruleType}</span>
      <span>{formatValue(rule.value, rule.unit)}</span>
      <span>v{rule.version}</span>
      <span className={rule.active ? styles.active : styles.inactive}>{rule.active ? "active" : "inactive"}</span>
      <span>{sourceLabel(rule.metadata)}</span>
     </div>
    ))}
   </div>
  </section>
 );
}
