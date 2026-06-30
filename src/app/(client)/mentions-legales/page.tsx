import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

export default function MentionsLegalesPage() {
 return (
  <main className={styles.page}>
   <PublicPageHeader />
   <section className={styles.hero}>
    <p className={styles.kicker}>Mentions legales</p>
    <h1>Informations legales NeoTravel</h1>
    <p>
     Page de demonstration du projet NeoTravel Epitech 2026. Les informations finales devront etre completees avant
     une mise en production reelle.
    </p>
   </section>
   <section className={styles.section}>
    <h2 data-i18n-key="Editeur du site">Editeur du site</h2>
    <p data-i18n-key="NeoTravel est une plateforme digitale spécialisée dans la gestion, la qualification et le suivi des demandes de transport. Elle met à disposition des clients, partenaires et équipes internes des outils destinés à faciliter l’organisation des trajets, la génération de devis et le suivi commercial.">
     NeoTravel est une plateforme digitale spécialisée dans la gestion, la qualification et le suivi des demandes de
     transport. Elle met à disposition des clients, partenaires et équipes internes des outils destinés à faciliter
     l’organisation des trajets, la génération de devis et le suivi commercial.
    </p>
    <h2 data-i18n-key="Responsabilite">Responsabilite</h2>
    <p data-i18n-key="Les informations présentées sur le site, notamment les prix, disponibilités, délais, partenaires et prestations proposées, sont fournies à titre indicatif et peuvent évoluer selon les conditions opérationnelles, les disponibilités réelles et les contraintes liées au transport.">
     Les informations présentées sur le site, notamment les prix, disponibilités, délais, partenaires et prestations
     proposées, sont fournies à titre indicatif et peuvent évoluer selon les conditions opérationnelles, les
     disponibilités réelles et les contraintes liées au transport.
    </p>
    <p data-i18n-key="Toute demande de transport, estimation tarifaire ou proposition commerciale doit faire l’objet d’une validation définitive par l’équipe NeoTravel ou par le partenaire concerné avant confirmation. NeoTravel ne saurait être tenu responsable d’une indisponibilité, d’une modification de tarif ou d’un changement de prestation avant validation finale.">
     Toute demande de transport, estimation tarifaire ou proposition commerciale doit faire l’objet d’une validation
     définitive par l’équipe NeoTravel ou par le partenaire concerné avant confirmation. NeoTravel ne saurait être
     tenu responsable d’une indisponibilité, d’une modification de tarif ou d’un changement de prestation avant
     validation finale.
    </p>
   </section>
   <PublicPageFooter />
  </main>
 );
}
