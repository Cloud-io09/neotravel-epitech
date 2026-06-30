import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { FileText, Lock, MessageSquare, ShieldCheck } from "lucide-react";
import { ClientSignupForm } from "../ClientSignupForm";
import styles from "../connexion.module.css";

export const metadata = {
  title: "Inscription client - NeoTravel",
  description: "Création de compte client NeoTravel."
};

const features = [
  {
    icon: FileText,
    title: "Suivi de vos demandes",
    body: "Retrouvez vos trajets, informations de contact et dossiers en cours au meme endroit."
  },
  {
    icon: MessageSquare,
    title: "Devis et documents",
    body: "Consultez vos devis, documents utiles et messages NeoTravel depuis votre espace client."
  },
  {
    icon: ShieldCheck,
    title: "Acces securise",
    body: "Creez votre compte avec email et mot de passe pour proteger vos informations."
  }
];

export default function ClientSignupPage() {
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

      <section className={styles.featureGrid} aria-label="Ce que couvre l'espace client">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <article className={styles.featureCard} key={feature.title}>
              <span className={styles.iconWrap}>
                <Icon aria-hidden="true" size={24} />
              </span>
              <div>
                <h2>{feature.title}</h2>
                <p>{feature.body}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.trustBand}>
        <Lock aria-hidden="true" size={22} />
        <p>
          Creation de compte chiffree. Votre espace client regroupe uniquement vos demandes,
          devis, documents et preferences NeoTravel.
        </p>
        <ShieldCheck aria-hidden="true" size={22} />
      </section>
    </main>
  );
}
