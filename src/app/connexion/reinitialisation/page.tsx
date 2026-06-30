import Image from "next/image";
import Link from "next/link";
import { ClientResetForm } from "../ClientResetForm";
import styles from "../connexion.module.css";

export const metadata = {
  title: "Reinitialisation mot de passe - NeoTravel",
  description: "Reinitialisation du mot de passe client NeoTravel."
};

export default function ClientPasswordResetPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>
        <Link className={styles.backLink} href="/connexion">
          Retour connexion
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="password-reset-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace client</p>
          <h1 id="password-reset-title">Reinitialiser votre mot de passe</h1>
          <p>
            Indiquez l'email associe a votre compte client pour recevoir les instructions de
            reinitialisation.
          </p>
        </div>

        <ClientResetForm />
      </section>
    </main>
  );
}
