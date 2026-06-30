import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getClientSession } from "@/shared/lib/auth/requireClient";
import { ClientSignupForm } from "../ClientSignupForm";
import styles from "../connexion.module.css";

export const metadata = {
  title: "Inscription client - NeoTravel",
  description: "Création de compte client NeoTravel."
};

export default async function ClientSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ quoteId?: string }>;
}) {
  const { quoteId } = await searchParams;
  // Already-logged-in clients skip signup and go straight to their devis (or their space).
  if (await getClientSession()) {
    redirect(quoteId ? `/client/devis/${quoteId}` : "/compte");
  }

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

      <section className={styles.hero} aria-labelledby="client-signup-title">
        <div className={styles.copy}>
          <p className={styles.kicker}>Espace client</p>
          <h1 id="client-signup-title">Créer votre compte client</h1>
          <p>
            Activez votre espace pour voir votre devis, suivre vos demandes, documents et préférences de contact.
          </p>
        </div>

        <Suspense fallback={<div className={styles.loginCard}>Chargement...</div>}>
          <ClientSignupForm />
        </Suspense>
      </section>
    </main>
  );
}
