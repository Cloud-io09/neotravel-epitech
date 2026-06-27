import Link from "next/link";
import Image from "next/image";
import { AccessibilityWidget } from "@/shared/accessibility/AccessibilityWidget";
import { LanguageSelector } from "@/shared/i18n/LanguageSelector";
import { HomeCarousel } from "./HomeCarousel";
import { LandingQuoteForm } from "./LandingQuoteForm";
import styles from "./home.module.css";

const projectCards = [
 {
  title: "Sorties scolaires",
  body: "Classes, associations, clubs et groupes jeunes avec trajet clair et suivi commercial."
 },
 {
  title: "Seminaires & entreprises",
  body: "Deplacements collaborateurs, salons, transferts gares, aeroports et evenements."
 },
 {
  title: "Sport & evenements",
  body: "Equipes, supporters, federations et grands rendez-vous avec reprise humaine si besoin."
 }
];

const engagementCards = ["Prix maitrise", "Rappel humain", "Relances suivies"];

const trustpilotReviews = [
 {
  id: "school",
  source: "Association scolaire",
  text: "Devis rapide, trajet clair et conseiller disponible pour finaliser la sortie."
 },
 {
  id: "company",
  source: "Responsable seminaire",
  text: "Reservation lisible, options bien suivies et reprise humaine quand le dossier devient sensible."
 },
 {
  id: "sport",
  source: "Club sportif",
  text: "Organisation fluide pour un groupe nombreux, avec suivi des relances sans perte d'information."
 }
];

export default function HomePage() {
 return (
  <main className={styles.page}>
   <header className={styles.header}>
    <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
     <Image className={styles.logoImage} src="/logo-neotravel.svg" alt="" width={250} height={72} priority />
    </Link>

    <div className={styles.headerActions}>
     <nav className={styles.nav} aria-label="Navigation principale">
      <a href="#estimation">Estimation</a>
      <a href="#projets">Vos projets</a>
      <Link href="/partenaires">Partenaires</Link>
      <a href="#engagements">Engagements</a>
     </nav>

     <LanguageSelector />
     <AccessibilityWidget />
    </div>
   </header>

   <section className={styles.hero} aria-labelledby="hero-title">
    <HomeCarousel />
    <div className={styles.heroContent}>
     <p className={styles.badge}>Transport de groupes avec chauffeur</p>
     <h1 id="hero-title">Location de car avec chauffeur</h1>
     <p>
      Quelle que soit la duree, que vous soyez 30 ou 500, NeoTravel structure votre demande,
      calcule un devis fiable et transmet les cas complexes a un conseiller.
     </p>
    </div>
   </section>

   <section className={styles.estimationBand} id="estimation" aria-label="Definissez votre projet">
    <LandingQuoteForm />
   </section>

   <section className={styles.projects} id="projets">
    <div className={styles.sectionTitle}>
     <p>Vos projets</p>
     <h2>Allez-y en autocar avec NeoTravel</h2>
    </div>
    <div className={styles.projectGrid}>
     {projectCards.map((card) => (
      <article className={styles.projectCard} key={card.title}>
       <h3>{card.title}</h3>
       <p>{card.body}</p>
      </article>
     ))}
    </div>
   </section>

   <section className={styles.partnerSection} id="partenaires">
    <div>
     <p className={styles.kicker}>Partenaires autocaristes</p>
     <h2>Des partenaires autocaristes adaptes a votre trajet.</h2>
     <p>
      NeoTravel prepare le dossier, qualifie le besoin et donne le contexte commercial.
      <br />
      La disponibilité réelle d&apos;un partenaire reste validée humainement.
     </p>
     <Link className={styles.secondaryButton} href="/partenaires">
      Partenaires
     </Link>
    </div>
    <ul className={styles.partnerFacts}>
     <li>Sélection indicative selon zone, capacité et type de trajet.</li>
     <li>Aucune promesse de vehicule sans validation partenaire.</li>
     <li>Un conseiller reprend le dossier si le trajet demande une verification particuliere.</li>
    </ul>
   </section>

   <section className={styles.engagements} id="engagements">
    <div className={styles.sectionTitle}>
     <p>Nos engagements</p>
     <h2>Une organisation simple, lisible et auditable</h2>
    </div>
    <div className={styles.engagementGrid}>
     {engagementCards.map((title) => (
      <article className={styles.engagementCard} key={title}>
       <h3>{title}</h3>
      </article>
     ))}
    </div>
   </section>

   <section className={styles.trustpilotBand} aria-label="Avis Trustpilot NeoTravel">
    <div className={styles.trustScore}>
     <p className={styles.kicker}>Avis Trustpilot</p>
     <h2>Excellent 4.9/5</h2>
     <span aria-label="5 etoiles">★★★★★</span>
    </div>
    <div className={styles.reviewTicker} aria-live="off">
     <div className={styles.reviewTrack}>
      {[...trustpilotReviews, ...trustpilotReviews].map((review, index) => (
       <article className={styles.reviewItem} key={`${review.id}-${index}`}>
        <span aria-hidden="true">★★★★★</span>
        <strong>{review.source}</strong>
        <p>{review.text}</p>
       </article>
      ))}
     </div>
    </div>
   </section>

   <footer className={styles.footer} id="suivi">
    <Link href="/mentions-legales">Mentions legales</Link>
    <Link href="/confidentialite">Confidentialite</Link>
    <Link href="/contact">Contact</Link>
    <Link href="/notre-equipe">Notre equipe</Link>
   </footer>
  </main>
 );
}
