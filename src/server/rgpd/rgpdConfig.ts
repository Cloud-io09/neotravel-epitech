export type RgpdStatus = "OK" | "À vérifier" | "Alerte";
export type RgpdSeverity = "Faible" | "Moyen" | "Élevé" | "Critique";

export type RgpdDataInventoryItem = {
  data: string;
  usage: string;
  purpose: string;
  sensitivity: "Personnel" | "Opérationnel" | "Non sensible" | "Technique" | "Potentiellement sensible";
  visibleBy: string;
  status: "Nécessaire" | "À limiter" | "Technique";
};

export type RgpdRetentionItem = {
  dataType: string;
  duration: string;
  justification: string;
  plannedAction: string;
  status: "Défini" | "À définir" | "À vérifier";
};

export type RgpdProcessorItem = {
  service: string;
  role: string;
  dataShared: string;
  frontendCall: "Oui" | "Non";
  serverSecret: "Oui" | "Non" | "À vérifier";
  risk: RgpdSeverity;
  status: string;
};

export type RgpdSecurityCheck = {
  control: string;
  status: RgpdStatus;
  severity: RgpdSeverity;
  recommendation: string;
};

export const rgpdDataInventory: RgpdDataInventoryItem[] = [
  {
    data: "Email client",
    usage: "Devis et relance",
    purpose: "Suivi commercial",
    sensitivity: "Personnel",
    visibleBy: "Équipe autorisée",
    status: "Nécessaire"
  },
  {
    data: "Téléphone",
    usage: "Contact client",
    purpose: "Suivi de la demande",
    sensitivity: "Personnel",
    visibleBy: "Équipe autorisée",
    status: "Nécessaire"
  },
  {
    data: "Départ / arrivée",
    usage: "Calcul et organisation du transport",
    purpose: "Traitement de la demande",
    sensitivity: "Opérationnel",
    visibleBy: "Équipe / partenaire si besoin",
    status: "Nécessaire"
  },
  {
    data: "Dates / horaires",
    usage: "Planification",
    purpose: "Organisation du transport",
    sensitivity: "Opérationnel",
    visibleBy: "Équipe / partenaire",
    status: "Nécessaire"
  },
  {
    data: "Nombre de passagers",
    usage: "Calcul tarifaire",
    purpose: "Génération du devis",
    sensitivity: "Non sensible",
    visibleBy: "Équipe",
    status: "Nécessaire"
  },
  {
    data: "Contraintes spécifiques",
    usage: "Qualification",
    purpose: "Adaptation de l'offre",
    sensitivity: "Potentiellement sensible",
    visibleBy: "Équipe autorisée",
    status: "À limiter"
  },
  {
    data: "Référence devis",
    usage: "Suivi commercial",
    purpose: "Traçabilité",
    sensitivity: "Non sensible",
    visibleBy: "Équipe / client",
    status: "Nécessaire"
  },
  {
    data: "Statut devis",
    usage: "Relance et conversion",
    purpose: "Suivi commercial",
    sensitivity: "Non sensible",
    visibleBy: "Équipe",
    status: "Nécessaire"
  },
  {
    data: "Empreinte hash",
    usage: "Preuve d'intégrité",
    purpose: "Audit",
    sensitivity: "Technique",
    visibleBy: "Équipe admin",
    status: "Technique"
  }
];

export const rgpdRetention: RgpdRetentionItem[] = [
  {
    dataType: "Lead non converti",
    duration: "Durée limitée",
    justification: "Suivi commercial raisonnable",
    plannedAction: "Suppression ou anonymisation",
    status: "À définir"
  },
  {
    dataType: "Devis accepté",
    duration: "Durée commerciale/comptable",
    justification: "Preuve de prestation",
    plannedAction: "Conservation contrôlée",
    status: "Défini"
  },
  {
    dataType: "Logs d'audit",
    duration: "Conservation longue",
    justification: "Preuve d'intégrité",
    plannedAction: "Archivage",
    status: "Défini"
  },
  {
    dataType: "Payload n8n",
    duration: "Court terme",
    justification: "Automatisation technique",
    plannedAction: "Nettoyage / minimisation",
    status: "Défini"
  },
  {
    dataType: "Email prospect",
    duration: "Durée limitée",
    justification: "Relance commerciale",
    plannedAction: "Suppression si inactif",
    status: "À définir"
  },
  {
    dataType: "PDF devis",
    duration: "Durée liée au devis",
    justification: "Preuve commerciale",
    plannedAction: "Accès sécurisé",
    status: "À vérifier"
  }
];

export const rgpdProcessors: RgpdProcessorItem[] = [
  {
    service: "Brevo",
    role: "Envoi email transactionnel",
    dataShared: "Email client, référence devis, lien/PDF",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Moyen",
    status: "Conforme si côté serveur"
  },
  {
    service: "n8n",
    role: "Automatisation relances / notifications",
    dataShared: "Référence devis, email, statut, dates relance",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Moyen",
    status: "Conforme si webhook protégé"
  },
  {
    service: "Base de données",
    role: "Stockage métier",
    dataShared: "Leads, clients, devis, logs",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Élevé",
    status: "À protéger"
  },
  {
    service: "Hébergement",
    role: "Exécution application",
    dataShared: "Données applicatives nécessaires",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Moyen",
    status: "À vérifier"
  },
  {
    service: "Stockage PDF",
    role: "Stockage devis PDF",
    dataShared: "PDF devis",
    frontendCall: "Non",
    serverSecret: "Oui",
    risk: "Élevé",
    status: "Doit être privé ou signé"
  }
];
