import Image from "next/image";
import Link from "next/link";
import { FileText, Lock, MessageSquare, ShieldCheck } from "lucide-react";
import { ClientLoginForm } from "./ClientLoginForm";
import styles from "./connexion.module.css";

export const metadata = {
  title: "Connexion client - NeoTravel",
  description: "Connexion à l'espace client NeoTravel."
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
    body: "Connexion par email et mot de passe pour proteger vos informations de voyage."
  }
];

export default function ClientConnexionPage() {
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

        <ClientLoginForm />

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
          Connexion chiffree. Votre espace client regroupe uniquement vos demandes, devis,
          documents et preferences NeoTravel.
        </p>
        <ShieldCheck aria-hidden="true" size={22} />
      </section>
    </main>
  );
}
