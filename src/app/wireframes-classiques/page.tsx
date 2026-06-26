import styles from "./wireframes-classiques.module.css";

const flowSteps = [
  "Landing",
  "Demande prospect",
  "Qualification IA",
  "Controle metier",
  "Calculer devis",
  "Suivi commercial"
];

const screens = [
  {
    title: "1. Landing commerciale",
    subtitle: "Entree du parcours client.",
    status: "CTA vers demande",
    blocks: [
      "Nom ou organisation",
      "Email",
      "Depart / arrivee",
      "Date depart / retour",
      "Message libre prospect"
    ],
    actions: ["Demarrer ma demande", "Connexion equipe"]
  },
  {
    title: "2. Demande prospect / conversation",
    subtitle: "Le client decrit son besoin.",
    status: "INCOMPLETE si champs manquants",
    blocks: [
      "Message prospect",
      "Questions IA",
      "Infos detectees",
      "Infos manquantes",
      "Recevoir mon devis"
    ],
    actions: ["Recevoir mon devis", "Completer"]
  },
  {
    title: "3. Devis client",
    subtitle: "Proposition apres calcul deterministe.",
    status: "Prix calcule par regles metier",
    blocks: [
      "Trajet + date",
      "Passagers + options",
      "Montant calcule",
      "Prix calcule par regles metier",
      "Accepter / Refuser / Modifier"
    ],
    actions: ["Accepter", "Refuser", "Modifier"]
  },
  {
    title: "4. Dashboard commercial",
    subtitle: "Vue pipeline interne.",
    status: "Pipeline commercial",
    blocks: [
      "Liste des demandes",
      "Statuts",
      "Priorite / urgence",
      "Prochaine relance",
      "Cout IA / appels"
    ],
    actions: ["Voir demande", "Human review"]
  },
  {
    title: "5. Fiche demande",
    subtitle: "Detail d'une demande.",
    status: "Detail lead",
    blocks: [
      "Infos prospect",
      "Trajet",
      "Messages",
      "Devis",
      "Historique + audit logs"
    ],
    actions: ["Escalader humain", "Modifier devis"]
  },
  {
    title: "6. Human review",
    subtitle: "Reprise commerciale.",
    status: "HUMAN_REVIEW",
    blocks: [
      "Demandes bloquees",
      "Raison du blocage",
      "Resume IA",
      "Action attendue",
      "Reprendre / escalader"
    ],
    actions: ["Reprendre", "Devis manuel"]
  },
  {
    title: "7. Relances",
    subtitle: "Suivi apres envoi du devis.",
    status: "Relance email",
    blocks: [
      "Relances prevues",
      "Relances envoyees",
      "Canal email",
      "Statut reponse",
      "Lien demande"
    ],
    actions: ["Marquer envoyee", "Replanifier"]
  },
  {
    title: "8. Partenaires autocaristes",
    subtitle: "Disponibilite indicative.",
    status: "Pas de flotte interne",
    blocks: [
      "Liste partenaires",
      "Zones desservies",
      "Capacites indicatives",
      "Statut a confirmer",
      "Agenda apres selection"
    ],
    actions: ["Poser option", "Confirmer commercial"]
  },
  {
    title: "9. Admin pricing / audit",
    subtitle: "Controle interne.",
    status: "Audit et regles",
    blocks: [
      "Regles pricing",
      "Route pricing",
      "Audit logs",
      "Model runs",
      "Actions n8n"
    ],
    actions: ["Voir regles", "Voir logs"]
  }
];

function MiniScreen({ title, subtitle, status, blocks, actions }: (typeof screens)[number]) {
  return (
    <article className={styles.screen}>
      <header className={styles.screenHeader}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span>Wireframe</span>
      </header>
      <div className={styles.status}>{status}</div>
      <div className={styles.heroBlock} />
      <div className={styles.blockGrid}>
        {blocks.map((block) => (
          <div className={styles.block} key={block}>
            <div className={styles.blockIcon} />
            <span>{block}</span>
          </div>
        ))}
      </div>
      <footer className={styles.actions}>
        {actions.map((action) => (
          <button key={action} type="button">
            {action}
          </button>
        ))}
      </footer>
    </article>
  );
}

export default function ClassicWireframesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <p className={styles.kicker}>NeoTravel MVP</p>
        <h1>Wireframes classiques</h1>
        <p>
          Page de cadrage simple pour montrer le parcours MVP sans habillage marketing :
          demande, qualification, devis, reprise humaine et suivi commercial.
        </p>
      </section>

      <section className={styles.flow} aria-label="Flux MVP">
        {flowSteps.map((step, index) => (
          <div className={styles.flowItem} key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step}</strong>
            {index < flowSteps.length - 1 ? <em>-&gt;</em> : null}
          </div>
        ))}
      </section>

      <section className={styles.grid} aria-label="Ecrans wireframes">
        {screens.map((screen) => (
          <MiniScreen key={screen.title} {...screen} />
        ))}
      </section>

      <section className={styles.notes}>
        <h2>Regles de lecture</h2>
        <ul>
          <li>Le prix vient uniquement de calculerDevis.</li>
          <li>La distance vient d&apos;une source auditable, jamais du LLM.</li>
          <li>Les cas incomplets bloquent le devis.</li>
          <li>Les cas complexes passent en HUMAN_REVIEW.</li>
          <li>NeoTravel gere des partenaires, pas une flotte interne.</li>
        </ul>
      </section>
    </main>
  );
}
