# Décisions — NeoTravel MVP

## 2026-06-24 — Socle Supabase sans dépendance client

- Le schéma SQL et les seeds sont fournis dans `supabase/`.
- `calculer_devis()` reste pur et ne lit/écrit pas Supabase.
- La table d'observabilité IA n'est pas créée en Sprint 1.
- `@supabase/supabase-js` n'est pas installé tant que le front/API Next.js n'en a pas besoin.

## 2026-06-30 — Devis multi-escales et relances standard

- Les trajets avec escales ne sont plus automatiquement bloqués si toutes les distances de tronçons sont contrôlées.
- `quote-service` découpe le trajet en tronçons et appelle `calculer_devis()` pour chaque sous-devis.
- Le devis final stocke `breakdown.routeSegments` et `breakdown.quoteLines`, puis additionne HT, TVA et TTC.
- Les relances standard sont alignées sur J+1, J+3, J+7 ; l'urgent reste J+1 unique ; le très urgent part en reprise humaine.
