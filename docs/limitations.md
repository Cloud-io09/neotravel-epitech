# Limitations — NeoTravel MVP

## Périmètre

NeoTravel est un prototype MVP. Le devis généré est une proposition commerciale estimative,
pas une facture ni une réservation ferme.

## Données personnelles

Données collectées au minimum :

- nom ou organisation ;
- email ;
- téléphone si fourni ;
- villes de trajet et escales ;
- dates ;
- nombre de passagers ;
- options demandées ;
- historique commercial utile au suivi.

Aucune donnée sensible n'est requise pour utiliser le parcours MVP.

## Conservation

Règle cible à confirmer avant production :

- leads et devis : conservation limitée au suivi commercial ;
- relances et audit logs : conservation limitée à la traçabilité opérationnelle ;
- demandes perdues ou clôturées : purge ou anonymisation à planifier.

Cette durée doit être validée juridiquement avant exploitation réelle.

## Emails et relances

n8n livre les emails et déclenche les relances dues. Si le webhook email est absent,
l'application simule l'envoi et journalise l'action.

## Distances

Les distances viennent d'une source contrôlée : seed, cache/base ou API de distance. Si une
distance de tronçon est introuvable, le dossier passe en reprise humaine.

## Non couvert par le MVP

- paiement ;
- signature contractuelle complète ;
- gestion avancée des disponibilités partenaires ;
- SLA d'envoi email ;
- politique RGPD finale ;
- interface de purge/anonymisation.
