# NeoTravel

Prototype MVP pour démontrer un parcours commercial amont de devis transport.

## Périmètre actuel

- Socle pricing déterministe en TypeScript.
- `calculer_devis()` est le seul composant autorisé à produire un prix.
- Pas d'agent IA, pas de Supabase, pas de front, pas d'appel réseau.

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

## Structure

- `src/lib/domain/status.ts` : statuts du pipeline.
- `src/lib/domain/types.ts` : types métier du pricing.
- `src/lib/pricing/pricing-rules.ts` : règles tarifaires isolées.
- `src/lib/pricing/calculer-devis.ts` : calcul pur et déterministe.
- `src/lib/pricing/calculer-devis.test.ts` : tests Vitest du pricing.
