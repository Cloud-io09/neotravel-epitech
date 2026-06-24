# NeoTravel

Prototype MVP pour démontrer un parcours commercial amont de devis transport.

## Périmètre actuel

- Socle pricing déterministe en TypeScript.
- Socle Supabase minimal : schéma SQL, seeds et variables d'environnement.
- `calculer_devis()` est le seul composant autorisé à produire un prix.
- Pas d'agent IA, pas de front, pas d'appel réseau.

## Installation

```bash
npm install
```

Les dépendances sont locales au projet et déclarées dans `package.json`.
Aucune installation globale n'est nécessaire.

## Commandes

```bash
npm test
npm run typecheck
```

## Supabase

Avec la CLI Supabase locale et Docker :

```bash
supabase start
supabase db reset
```

La CLI applique les migrations dans `supabase/migrations/`, puis exécute `supabase/seed.sql`.

Avec Supabase Cloud, exécuter manuellement dans l'éditeur SQL :

1. `supabase/schema.sql`
2. `supabase/seed.sql`

## Structure

- `src/lib/domain/status.ts` : statuts du pipeline.
- `src/lib/domain/types.ts` : types métier du pricing.
- `src/lib/pricing/pricing-rules.ts` : règles tarifaires isolées.
- `src/lib/pricing/calculer-devis.ts` : calcul pur et déterministe.
- `src/lib/pricing/calculer-devis.test.ts` : tests Vitest du pricing.
- `supabase/schema.sql` : tables minimales du MVP.
- `supabase/migrations/` : migrations utilisées par la CLI Supabase locale.
- `supabase/seed.sql` : matrice tarifaire v1 et routes de démonstration.
