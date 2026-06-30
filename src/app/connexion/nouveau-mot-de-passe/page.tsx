import Image from "next/image";
import Link from "next/link";
import { ClientNewPasswordForm } from "../ClientNewPasswordForm";
import styles from "../connexion.module.css";

export const metadata = {
  title: "Nouveau mot de passe - NeoTravel",
  description: "Définir un nouveau mot de passe pour votre compte client NeoTravel."
};

export default function ClientNewPasswordPage() {
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

      <section className={styles.hero} aria-labelledby="new-password-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace client</p>
          <h1 id="new-password-title">Choisir un nouveau mot de passe</h1>
          <p>Définissez votre nouveau mot de passe pour accéder à votre espace client.</p>
        </div>

        <ClientNewPasswordForm />
      </section>
    </main>
  );
}
