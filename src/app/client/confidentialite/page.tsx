import { PublicPageFooter, PublicPageHeader } from "../PublicPageShell";
import styles from "../public-pages.module.css";

export default function ConfidentialitePage() {
  return (
    <main className={styles.page}>
      <PublicPageHeader />
      <section className={styles.hero}>
        <p className={styles.kicker}>Confidentialité & RGPD</p>
        <h1>Vos données servent uniquement au traitement de votre demande</h1>
        <p>
          NeoTravel limite l&apos;usage des informations au devis, au suivi commercial, aux relances et à la reprise humaine
          lorsque le dossier le nécessite.
        </p>
      </section>

      <section className={styles.section}>
        <h2 data-i18n-key="Données traitées">Données traitées</h2>
        <p data-i18n-key="NeoTravel collecte et traite les données nécessaires à la gestion des demandes de transport, à l’établissement des devis, au suivi commercial et à la coordination avec les partenaires.">
          NeoTravel collecte et traite les données nécessaires à la gestion des demandes de transport, à l’établissement
          des devis, au suivi commercial et à la coordination avec les partenaires.
        </p>
        <p data-i18n-key="Ces données peuvent inclure les informations de trajet, les coordonnées de contact, les références de demande, les statuts de devis, les relances, les validations, les refus ainsi que les informations utiles à l’organisation du transport.">
          Ces données peuvent inclure les informations de trajet, les coordonnées de contact, les références de demande,
          les statuts de devis, les relances, les validations, les refus ainsi que les informations utiles à
          l’organisation du transport.
        </p>
        <p data-i18n-key="Les données sont utilisées exclusivement pour assurer le traitement des demandes, améliorer le suivi client et garantir la bonne coordination des prestations.">
          Les données sont utilisées exclusivement pour assurer le traitement des demandes, améliorer le suivi client et
          garantir la bonne coordination des prestations.
        </p>
      </section>

      <section className={styles.section}>
        <h2 data-i18n-key="Droits des utilisateurs">Droits des utilisateurs</h2>
        <p data-i18n-key="Conformément à la réglementation applicable en matière de protection des données, vous disposez d’un droit d’accès, de rectification, d’opposition, de limitation et de suppression des données personnelles vous concernant.">
          Conformément à la réglementation applicable en matière de protection des données, vous disposez d’un droit
          d’accès, de rectification, d’opposition, de limitation et de suppression des données personnelles vous
          concernant. Pour cela veuillez contacter neotravel@gmail.com
        </p>
        <p data-i18n-key="Vous pouvez exercer ces droits en contactant NeoTravel à l’adresse prévue à cet effet. Toute demande sera étudiée dans les meilleurs délais, sous réserve des obligations légales ou contractuelles pouvant imposer la conservation de certaines informations.">
          Vous pouvez exercer ces droits en contactant NeoTravel à l’adresse prévue à cet effet. Toute demande sera
          étudiée dans les meilleurs délais, sous réserve des obligations légales ou contractuelles pouvant imposer la
          conservation de certaines informations.
        </p>
        <p data-i18n-key="NeoTravel s’engage à traiter les données personnelles de manière confidentielle, sécurisée et proportionnée aux finalités du service.">
          NeoTravel s’engage à traiter les données personnelles de manière confidentielle, sécurisée et proportionnée aux
          finalités du service.
        </p>
      </section>
      <section className={styles.section}>
        <h2>Durees de conservation</h2>
        <p>
          NeoTravel conserve les donnees uniquement pendant la duree necessaire au traitement des demandes, au suivi
          commercial, a la preuve des echanges et au respect des obligations legales.
        </p>
        <p>
          A titre indicatif, une demande incomplete sans reponse peut etre conservee 6 mois, un prospect sans suite 12
          mois, un devis refuse ou expire 24 mois, et un devis accepte pendant la duree imposee par les obligations
          comptables ou contractuelles.
        </p>
        <p>
          Les logs techniques sont conserves sur une duree courte, en principe 3 a 6 mois. Les choix cookies sont
          conserves 12 mois. Une demande de suppression peut donner lieu a la conservation d'une preuve de traitement
          pendant 12 mois.
        </p>
      </section>
      <section className={styles.section} id="cookies">
        <h2>Politique cookies</h2>
        <p>
          NeoTravel utilise des cookies necessaires au bon fonctionnement du site : securite, session, connexion a
          l&apos;espace client ou administrateur, et memorisation de votre choix de consentement.
        </p>
        <p>
          Le choix relatif aux cookies est conserve pendant 12 mois via le cookie technique
          <strong> neotravel_cookie_consent</strong>. Vous pouvez modifier ce choix a tout moment avec le bouton
          Cookies affiche en bas de l&apos;ecran.
        </p>
        <p>
          Les cookies de mesure d&apos;audience et les cookies marketing sont optionnels. Ils ne doivent pas etre
          actives ni charges avant votre accord explicite. A ce stade, NeoTravel ne charge pas de pixel publicitaire
          par defaut.
        </p>
      </section>
      <PublicPageFooter />
    </main>
  );
}
