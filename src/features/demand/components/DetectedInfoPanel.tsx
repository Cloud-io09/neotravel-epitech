import styles from "./demand.module.css";

export function DetectedInfoPanel() {
 return (
  <section className={styles.card} aria-labelledby="detected-title">
   <h2 id="detected-title">Infos detectees</h2>
   <ul className={styles.list}>
    <li>
     Depart <strong>Paris</strong>
    </li>
    <li>
     Arrivee <strong>Lyon</strong>
    </li>
    <li>
     Date depart <strong>15/07/2026</strong>
    </li>
    <li>
     Passagers <strong>42</strong>
    </li>
    <li>
     Type trajet <strong>Aller simple</strong>
    </li>
    <li>
     Options <strong>Guide a confirmer</strong>
    </li>
   </ul>
   <div className={styles.chips}>
    <span className={styles.chip}>QUALIFICATION</span>
    <span className={styles.chip}>Prix non calcule par IA</span>
   </div>
  </section>
 );
}
