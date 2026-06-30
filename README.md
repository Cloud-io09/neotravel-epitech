# NeoTravel

MVP d'un parcours commercial amont (prospect → lead qualifié → devis → relances) pour
le transport de groupe en autocar. L'IA orchestre et qualifie, le **code déterministe
calcule le prix**, l'humain reprend les cas sensibles.

## Périmètre actuel

- Parcours prospect conversationnel (`/client/demande`) avec extraction déterministe des champs critiques.
- Pricing déterministe en TypeScript : `calculer_devis()` est le **seul** composant autorisé à produire un prix.
- Agent via Vercel AI SDK avec tools contrôlés ; le LLM n'invente jamais ni prix ni distance.
- Dashboard commercial complet : demandes, devis, relances, human review, KPIs, coûts IA, RGPD.
- Devis PDF généré côté serveur (rendu HTML + repli vectoriel), avec emplacement de signature.
- Comptes client adossés à **Supabase Auth** (espace `/compte` : devis, demandes, documents).
- Emails transactionnels (`src/features/emails/templates/`) envoyés via webhooks **n8n**.
- Relances **J+1 / J+3 / J+7** orchestrées par n8n (cron `send-due`), mode démo accéléré disponible.
- Sécurité : **RLS deny-all** sur toutes les tables ; tout accès données passe par le `service_role` côté serveur.
- n8n orchestre uniquement emails, relances et notifications — **jamais le prix**.

## Installation

```bash
npm install
```

Toutes les dépendances sont locales (`package.json`). Aucune installation globale requise.

## Commandes

```bash
npm run dev        # serveur de dev Next.js
npm run build      # build de production
npm test           # suite Vitest
npm run typecheck  # tsc --noEmit
```

Test d'intégration Supabase local :

```bash
supabase start
supabase db reset
npm run test:integration   # exporte automatiquement l'env via `supabase status -o env`
```

## Provider IA

Le modèle de chat est résolu par `getChatModel()` dans
[`src/lib/ai/provider.ts`](src/lib/ai/provider.ts). Deux fournisseurs, par ordre de priorité :

1. **Vercel AI Gateway** si `AI_GATEWAY_API_KEY` est défini
   (modèle : `AI_GATEWAY_MODEL_ID` ou `AI_MODEL_ID`, défaut `openai/gpt-5-mini`).
2. **OpenRouter** si `AI_API_KEY` est défini
   (modèle : `AI_MODEL_ID`, défaut `openai/gpt-oss-120b:free`).

Si aucune clé n'est présente, l'agent est désactivé et `/api/chat` renvoie un statut métier explicite.
Les tools NeoTravel restent les seuls à créer un lead, résoudre une distance ou calculer un devis.
`/api/chat` retourne toujours un JSON commun : `status`, `message`, puis `leadId`, `quoteId`,
`missingFields` ou `reviewReason` selon le cas. Les logs `[neotravel:agent]` tracent les phases
serveur sans afficher le message complet ni l'email.

## Sécurité & accès données

- **RLS deny-all** : la migration `20260629110000_enable_rls_lockdown.sql` active la RLS sans
  policy sur toutes les tables → l'`anon` (clé publique navigateur) et l'`authenticated` n'ont
  **aucun** accès direct. Toute lecture/écriture légitime passe par le `service_role` côté serveur
  (qui contourne la RLS). Toute nouvelle table publique **doit** activer la RLS dans sa migration.
- **Comptes client** : adossés à Supabase Auth, tagués `app_metadata.role = "client"`. Le lien
  `clients.auth_user_id` permet au serveur de scoper les données au client connecté. Le rôle est
  posé à l'inscription ([`registerClientAccount.ts`](src/features/clients/services/registerClientAccount.ts))
  et vérifié au login ([`/api/auth/client-login`](src/app/api/auth/client-login/route.ts)).
- Les clés secrètes (`SUPABASE_SERVICE_ROLE_KEY`, `AI_*`, `ORS_API_KEY`) vivent uniquement dans
  `.env.local`, jamais committées. La clé `NEXT_PUBLIC_SUPABASE_ANON_KEY` est publique (sûre côté RLS).

## Devis PDF

[`generateQuotePdf.ts`](src/features/quote/services/generateQuotePdf.ts) produit le PDF du devis
avec deux chemins :

1. **Rendu HTML** via un navigateur headless (Chrome / Chromium / Edge, détecté sur macOS, Linux,
   Windows, ou via `NEOTRAVEL_PDF_BROWSER`) — sortie centrée, une page A4, accents préservés.
2. **Repli vectoriel** déterministe (sans dépendance navigateur) si aucun navigateur n'est trouvé
   (ex. serverless).

Le trajet affiché inclut les **arrêts intermédiaires** (`Départ → escales → Arrivée`). Le prix
provient toujours du devis calculé ; le PDF ne calcule rien.

## n8n / emails / relances

Templates utilisés (`src/features/emails/templates/`) :

- `00_demande_incomplete.html`
- `01_demande_en_cours.html`
- `02_devis_disponible.html`
- `03_relance_j1.html`
- `04_relance_j3.html`
- `05_relance_j7.html`
- `06_creation_compte.html`

Le chemin recommandé pour le MVP est un seul webhook `N8N_CUSTOMER_EMAIL_WEBHOOK`. Si aucun webhook
n'est configuré, l'envoi est **simulé et journalisé** sans appel réseau (et non bloquant).

Relances **J+1 / J+3 / J+7** après envoi du devis (cas urgent < 7j : une seule relance J+1 ; départ
< 48h : pas de relance, escalade humaine). Un cron n8n appelle périodiquement la route de traitement :

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/followups/send-due" \
  -H "content-type: application/json" \
  -H "x-neotravel-webhook-secret: $N8N_WEBHOOK_SECRET" \
  -d '{"limit":20}'
```

Les workflows n8n versionnés sont dans [`docs/n8n/`](docs/n8n/) (email client, relances prod,
relances démo accélérée).

## Supabase

Avec la CLI Supabase locale et Docker :

```bash
supabase start
supabase db reset   # applique supabase/migrations/ puis supabase/seed.sql
```

Avec Supabase Cloud, exécuter manuellement dans l'éditeur SQL : `supabase/schema.sql` puis
`supabase/seed.sql`, et appliquer les migrations de `supabase/migrations/` (dont la RLS lockdown).

## Variables d'environnement

Voir [`.env.example`](.env.example). Principales :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# IA — Gateway prioritaire, sinon OpenRouter
AI_GATEWAY_API_KEY=
AI_GATEWAY_MODEL_ID=openai/gpt-5-mini
AI_API_KEY=
AI_MODEL_ID=openai/gpt-oss-120b:free

# App / distance / emails
NEXT_PUBLIC_APP_URL=http://localhost:3000
ORS_API_KEY=
RESEND_API_KEY=

# n8n
N8N_CUSTOMER_EMAIL_WEBHOOK=
N8N_WEBHOOK_SECRET=
```

## Structure

- [`src/lib/domain/types.ts`](src/lib/domain/types.ts) — types métier du pricing (`TripType`, etc.).
- [`src/lib/domain/schemas.ts`](src/lib/domain/schemas.ts) — schémas Zod partagés, champs critiques.
- [`src/shared/types/lead.ts`](src/shared/types/lead.ts) — `LeadStatus` (source des statuts pipeline).
- [`src/shared/types/followup.ts`](src/shared/types/followup.ts) — `FollowupStatus`.
- [`src/lib/ai/provider.ts`](src/lib/ai/provider.ts) — sélection du modèle (Gateway / OpenRouter).
- [`src/lib/ai/prompt.ts`](src/lib/ai/prompt.ts) — prompt système et garde-fous anti-injection.
- [`src/lib/ai/tools.ts`](src/lib/ai/tools.ts) — tools contrôlés exposés à l'agent.
- [`src/lib/ai/extract-turn-facts.ts`](src/lib/ai/extract-turn-facts.ts) — extraction déterministe par tour.
- [`src/lib/ai/detect-intermediate-stops.ts`](src/lib/ai/detect-intermediate-stops.ts) — détection des arrêts → HUMAN_REVIEW.
- [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) — route API du chat.
- [`src/lib/pricing/calculer-devis.ts`](src/lib/pricing/calculer-devis.ts) — calcul pur et déterministe (+ tests).
- [`src/lib/pricing/resolve-distance.ts`](src/lib/pricing/resolve-distance.ts) — résolution de distance (seed → API → HUMAN_REVIEW).
- [`src/lib/quotes/quote-service.ts`](src/lib/quotes/quote-service.ts) — orchestration lead → devis sauvegardé.
- [`src/features/quote/services/generateQuotePdf.ts`](src/features/quote/services/generateQuotePdf.ts) — génération du PDF de devis.
- [`src/features/followups/services/scheduleFollowups.ts`](src/features/followups/services/scheduleFollowups.ts) — planification des relances J+1/J+3/J+7.
- [`src/features/emails/services/`](src/features/emails/services/) — rendu des templates et payloads n8n.
- [`src/features/clients/services/registerClientAccount.ts`](src/features/clients/services/registerClientAccount.ts) — création de compte client (Supabase Auth).
- [`src/shared/lib/data/`](src/shared/lib/data/) — repositories (accès `service_role`, mode démo).
- [`src/app/dashboard/`](src/app/dashboard/) — pages du dashboard commercial.
- [`supabase/migrations/`](supabase/migrations/) — migrations (schéma, RLS lockdown, statuts relances, auth client).
- [`docs/contrat-technique.md`](docs/contrat-technique.md) — contrat technique (source de vérité).
- [`docs/decisions.md`](docs/decisions.md) — journal des décisions.
- [`docs/n8n/`](docs/n8n/) — workflows n8n versionnés.
