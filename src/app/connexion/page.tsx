import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getClientSession } from "@/shared/lib/auth/requireClient";
import { ClientLoginForm } from "./ClientLoginForm";
import styles from "./connexion.module.css";

export const metadata = {
  title: "Connexion client - NeoTravel",
  description: "Connexion à l'espace client NeoTravel."
};

export default async function ClientConnexionPage() {
  // Already-logged-in clients go straight to their space (no dead-end login page).
  if (await getClientSession()) redirect("/compte");

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>
        <Link className={styles.backLink} href="/">
          Retour accueil
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="client-connexion-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace client</p>
          <h1 id="client-connexion-title">Connexion à votre compte client</h1>
          <p>Renseignez l&apos;email utilisé pour votre demande ou votre devis NeoTravel.</p>
        </div>

        <Suspense fallback={<div className={styles.loginCard}>Chargement...</div>}>
          <ClientLoginForm />
        </Suspense>

        <section className={styles.signupCard} aria-label="Création de compte client">
          <div>
            <p className={styles.kicker}>Nouveau client</p>
            <h2>S&apos;inscrire</h2>
            <p>
              Créez un compte client pour retrouver vos demandes, devis, documents et préférences.
            </p>
          </div>
          <Link className={styles.secondaryButton} href="/connexion/inscription">
            Créer mon compte
          </Link>
        </section>
      </section>
    </main>
  );
}
