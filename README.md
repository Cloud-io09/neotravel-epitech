# NeoTravel

Prototype MVP de qualification et suivi commercial pour NeoTravel, PME d'intermediation specialisee dans le transport de groupe.

NeoTravel ne possede pas de flotte en propre. Sa valeur est de qualifier le besoin client, identifier le bon partenaire autocariste, negocier les conditions et securiser la prestation. Le MVP automatise le cycle commercial amont : demande prospect, qualification IA controlee, calcul de devis, proposition, relance, dashboard et reprise humaine.

Le perimetre est volontairement cible : transport de groupe intermedie par NeoTravel. Le MVP n'est pas un comparateur de voyage generaliste, un CRM complet, ni une plateforme de gestion de flotte interne.

## Statut du projet

Etat actuel :

- squelette Next.js cree ;
- documentation kick-off et cadrage integree ;
- reference Figma v12 extraite ;
- tests pricing, garde-fous et API poses ;
- migrations Supabase presentes ;
- workflows n8n placeholders presents ;
- `npm run typecheck` OK ;
- `npm test` OK ;
- 156 tests unitaires OK ;
- devis multi-escales operationnel ;
- relances standard alignees sur J+1, J+3 et J+7.

Pour connaitre la derniere sauvegarde Git, utiliser `git log --oneline -5`.

## Regle centrale

- IA : collecte, structure, clarifie, resume, oriente.
- Code : valide, calcule, bloque, trace.
- Humain : reprend les cas complexes, sensibles ou hors perimetre.

L'IA ne calcule jamais le prix. Le montant vient uniquement de `calculer_devis()`.

## Distance et API externe

Le kilometrage est resolu avant le calcul de prix par une source controlee. Pour les devis,
le service utilise `src/lib/pricing/resolve-distance.ts` ; pour les apercus de route, le
module partage `src/shared/lib/distance/resolveDistance.ts` peut utiliser cache, ORS ou OSRM.

Ordre en mode `DISTANCE_PROVIDER=hybrid` :

1. cache/base interne valide ;
2. OpenRouteService si `OPENROUTESERVICE_API_KEY` ou `ORS_API_KEY` est renseignee ;
3. OSRM si `OSRM_BASE_URL` est renseigne ;
4. `HUMAN_REVIEW` si aucune distance fiable n'est obtenue.

`calculer_devis()` ne contacte jamais d'API externe. Il recoit seulement une distance deja validee et auditee.

Connexion OpenRouteService :

1. Creer un compte sur https://openrouteservice.org/.
2. Generer une cle API dans le dashboard OpenRouteService.
3. Ajouter dans `.env.local` :

```env
DISTANCE_PROVIDER=hybrid
OPENROUTESERVICE_API_KEY=
# ou ORS_API_KEY= pour le service de devis
```

Sans cle API, le projet reste utilisable en `NEXT_PUBLIC_DEMO_MODE=true` avec les routes controlees et le fallback `HUMAN_REVIEW`.

## Stack retenue

Option B du kick-off : agent dans le code.

| Bloc | Choix |
| --- | --- |
| Front | Next.js App Router |
| UI | React, CSS modules |
| IA | Vercel AI SDK / provider configurable |
| Donnees | Supabase |
| Automatisations | n8n pour relances et notifications |
| Tests | Vitest |
| Deploiement | Vercel |

## Installation locale

```bash
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

Si npm bloque sur un certificat SSL :

```powershell
$env:npm_config_cache="E:\Neotravel\.npm-cache"
$env:npm_config_strict_ssl="false"
npm install
```

## Variables d'environnement

Copier `.env.example` vers `.env.local` puis renseigner les valeurs.

Variables principales :

```bash
NEXT_PUBLIC_DEMO_MODE=true
DEMO_FAST_FOLLOWUP=false
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL_ID=openai/gpt-5-mini
AI_API_KEY=
AI_MODEL_ID=openai/gpt-oss-120b:free
DISTANCE_PROVIDER=hybrid
DISTANCE_CACHE_TTL_DAYS=30
DISTANCE_API_TIMEOUT_MS=3000
DISTANCE_MAX_KM=1500
OPENROUTESERVICE_API_KEY=
OSRM_BASE_URL=
N8N_BASE_URL=
N8N_WEBHOOK_SECRET=
N8N_CUSTOMER_EMAIL_WEBHOOK=
N8N_SEND_QUOTE_WEBHOOK=
N8N_FOLLOWUP_WEBHOOK=
N8N_HUMAN_REVIEW_WEBHOOK=
N8N_DAILY_DIGEST_WEBHOOK=
ORS_API_KEY=
```

Les variables de reference sont dans `.env.example`.

## DEMO_MODE

Par defaut, le projet peut fonctionner sans Supabase reel :

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Dans ce mode, les API et services utilisent `src/shared/lib/demo/demoStore.ts`. Cela permet de tester les leads, devis, relances, audit logs, model runs, pricing rules et route pricing sans service externe.

Pour une demonstration acceleree des relances :

```bash
DEMO_FAST_FOLLOWUP=true
```

Cette option compresse les relances pour les demonstrations : urgent a +1 minute, standard a +1, +2 et +3 minutes. La regle metier reelle reste J+1 unique pour urgent traitable et J+1/J+3/J+7 pour standard.

Pour passer a Supabase reel :

1. creer le projet Supabase ;
2. lancer les migrations dans `supabase/migrations` ;
3. executer `supabase/seed.sql` ;
4. renseigner les variables Supabase ;
5. passer `NEXT_PUBLIC_DEMO_MODE=false`.

## Scripts utiles

```bash
npm run dev        # serveur local
npm run build      # build production
npm run typecheck  # verification TypeScript
npm test           # tests Vitest
npm audit          # audit securite npm
```

## Routes principales

Client :

- `/` : landing conversationnelle ;
- `/client/demande` : demande prospect et qualification IA ;
- `/client/devis/[quoteId]` : proposition de devis client ;
- `/connexion` et `/connexion/inscription` : acces espace client ;
- `/compte` : espace client.

Dashboard :

- `/dashboard` : vue commerciale ;
- `/dashboard/demandes` : liste des demandes ;
- `/dashboard/demandes/[leadId]` : fiche demande ;
- `/dashboard/relances` : relances ;
- `/dashboard/relances/[followupId]` : detail relance ;
- `/dashboard/human-review` : reprise humaine ;
- `/dashboard/partenaires` : partenaires autocaristes.

Admin :

- `/admin` ;
- `/admin/pricing` ;
- `/admin/audit`.

API :

- `/api/chat` ;
- `/api/ai/extract-demand` ;
- `/api/ai/clarify` ;
- `/api/ai/summarize` ;
- `/api/leads` ;
- `/api/quotes` ;
- `/api/quotes/[quoteId]/accept` ;
- `/api/quotes/[quoteId]/refuse` ;
- `/api/quotes/[quoteId]/request-change` ;
- `/api/quotes/[quoteId]/send` ;
- `/api/quotes/[quoteId]/pdf` ;
- `/api/followups` ;
- `/api/followups/[followupId]/send` ;
- `/api/followups/send-due` ;
- `/api/human-review` ;
- `/api/dashboard` ;
- `/api/n8n/send-quote` ;
- `/api/n8n/followup` ;
- `/api/n8n/human-review-notify` ;
- `/api/n8n/daily-digest`.

## Parcours MVP

1. Le prospect decrit son besoin.
2. L'IA extrait les informations utiles.
3. Le code verifie les champs critiques.
4. Si la demande est incomplete, statut `INCOMPLETE`.
5. Si la demande est complexe, statut `HUMAN_REVIEW`.
6. Si la demande est standard, `calculer_devis()` calcule le prix.
7. Une proposition est generee.
8. Une relance est planifiee.
9. Le dashboard suit le pipeline.

## Regles metier importantes

- Pas de devis si les champs critiques manquent.
- Pas de prix calcule par IA.
- Pas de disponibilite partenaire reelle promise.
- Pas de statut maintenance/reparation : NeoTravel gere des partenaires, pas une flotte interne.
- Une remise exceptionnelle est manuelle, justifiee et auditee.
- Les cas urgents ou sensibles passent en `HUMAN_REVIEW`.
- Les donnees invalides ou manquantes passent en `INCOMPLETE` ; les demandes possibles mais hors seuil automatique, par exemple plus de 85 passagers, passent en `HUMAN_REVIEW` pour validation multi-autocars/partenaire.
- Les trajets avec escales sont decomposes en troncons : chaque troncon est resolu et chiffre separement, puis le total final additionne les sous-devis.
- Si une distance de troncon est introuvable, le dossier passe en `HUMAN_REVIEW`.
- Le pricing suit le kick-off : distance controlee, grille forfaitaire transfert simple jusqu'a 180 km, formule `(km x 2) x 2,5 EUR` au-dela, type vehicule pour audit/capacite, coefficients saison/urgence/capacite, options, marge 15 % et TVA 10 %. Les routes seedees ne sont que des distances de demo controlees, pas une source officielle exhaustive.

## Donnees

Tables Supabase prevues :

- `clients`
- `leads`
- `quotes`
- `pricing_matrices`
- `route_pricing`
- `followups`
- `audit_logs`
- `model_runs`

Migrations :

```bash
supabase/migrations/
```

Seed de demo :

```bash
supabase/seed.sql
```

## Documents projet

- `docs/contrat-technique.md` : exigences techniques MVP.
- `docs/decisions.md` : decisions d'architecture.
- `docs/golden-set.md` : scenarios de validation.
- `docs/limitations.md` : limites MVP, RGPD et conservation.
- `docs/prompt-system.md` : contrat du prompt systeme.
- `docs/n8n/README.md` : runbook emails et relances n8n.

## References Figma

Images et assets publics dans :

```bash
public/images/
```

Les logos sont dans `public/logo-neotravel.svg` et `public/logo-neotravel-v12.svg`.

## n8n

n8n reste limite aux relances, emails et notifications.

Workflows placeholders :

```bash
docs/n8n/
```

## Prochaine etape conseillee

Ordre de validation recommande :

1. tester une demande directe sans escale ;
2. tester une demande multi-escales ;
3. envoyer un devis depuis le dashboard ;
4. verifier la creation des relances ;
5. verifier `/api/followups/send-due` avec le secret n8n ;
6. tester un email reel en environnement de preproduction ;
7. deployer Vercel apres migrations Supabase.

## Verification avant cloud

Avant de pousser en demo cloud :

```bash
$env:NODE_OPTIONS="--use-system-ca"; npm audit
npm run typecheck
npm test
npm run build
```

Etat attendu :

- 0 vulnerabilite npm ;
- typecheck sans erreur ;
- tests Vitest OK ;
- build Next.js OK.
