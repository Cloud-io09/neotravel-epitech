# NeoTravel

Prototype MVP pour démontrer un parcours commercial amont de devis transport.

## Périmètre actuel

- Socle pricing déterministe en TypeScript.
- Socle Supabase minimal : schéma SQL, seeds et variables d'environnement.
- Agent Vercel AI SDK minimal avec tools contrôlés.
- Front prospect et dashboard commercial connectés au pipeline.
- Emails clients préparés depuis `src/features/emails/templates/` et envoyés via webhooks n8n.
- `calculer_devis()` est le seul composant autorisé à produire un prix.
- n8n orchestre uniquement les emails, relances et notifications ; jamais le prix.

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

Test d'intégration Supabase local :

```bash
supabase start
supabase db reset
set -a; eval "$(supabase status -o env)"; set +a
npm run test:integration
```

`set -a` exporte les variables retournées par `supabase status -o env` pour que
`createServerSupabaseClient()` puisse lire `NEXT_PUBLIC_SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` au moment de l'appel.

Agent IA local :

```bash
export GEMINI_API_KEY=...
export AI_MODEL_ID=gemini-3-flash-preview
export AGENT_DEBUG_LOGS=true
export AGENT_QUALIFICATION_TIMEOUT_MS=15000
npm run dev
```

Le modèle Gemini est appelé via le provider AI SDK `@ai-sdk/google`. Les tools NeoTravel
restent les seuls à créer un lead, résoudre une distance ou calculer un devis.
Les logs `[neotravel:agent]` tracent les phases serveur sans afficher le message complet ni l'email.
`/api/chat` retourne toujours un JSON métier commun : `status`, `message`, puis `leadId`,
`quoteId`, `missingFields` ou `reviewReason` selon le cas.

## n8n / emails

Templates utilisés :

- `src/features/emails/templates/00_demande_incomplete.html`
- `src/features/emails/templates/01_demande_en_cours.html`
- `src/features/emails/templates/02_devis_disponible.html`
- `src/features/emails/templates/03_relance_j2.html`
- `src/features/emails/templates/04_relance_j7.html`

Variables minimales :

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
N8N_CUSTOMER_EMAIL_WEBHOOK=https://...
N8N_WEBHOOK_SECRET=...
```

Le chemin recommandé pour le MVP est un seul webhook `N8N_CUSTOMER_EMAIL_WEBHOOK`.
Si aucun webhook n'est configuré, l'envoi est simulé et journalisé sans appel réseau.

Payload envoyé à n8n :

```json
{
  "event": "customer_email",
  "scenario": "QUOTE_AVAILABLE",
  "to": { "email": "client@example.com", "name": "Client" },
  "subject": "Votre devis NeoTravel est disponible",
  "html": "...",
  "text": "...",
  "lead": { "id": "...", "route": "Paris → Lyon" },
  "quote": { "id": "...", "url": "https://..." }
}
```

Workflow n8n attendu :

1. Webhook `POST` qui reçoit le payload ci-dessus.
2. Vérification optionnelle du header `x-neotravel-webhook-secret`.
3. Node email/Resend/SMTP : `to.email`, `subject`, `html`.
4. Pour les relances automatiques, planifier un cron n8n qui appelle :

```bash
curl -X POST "$NEXT_PUBLIC_APP_URL/api/followups/send-due" \
  -H "content-type: application/json" \
  -H "x-neotravel-webhook-secret: $N8N_WEBHOOK_SECRET" \
  -d '{"limit":20}'
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
- `src/lib/domain/schemas.ts` : schémas Zod partagés.
- `src/lib/ai/prompt.ts` : prompt système et garde-fous injection.
- `src/lib/ai/tools.ts` : tools contrôlés exposés à l'agent.
- `src/app/api/chat/route.ts` : route API chat minimale.
- `src/lib/pricing/pricing-rules.ts` : règles tarifaires isolées.
- `src/lib/pricing/calculer-devis.ts` : calcul pur et déterministe.
- `src/lib/pricing/calculer-devis.test.ts` : tests Vitest du pricing.
- `src/lib/pricing/lookup-pricing-rules.ts` : lecture de la matrice active Supabase.
- `src/lib/pricing/resolve-distance.ts` : résolution de distance depuis `route_pricing`.
- `src/lib/quotes/quote-service.ts` : orchestration lead → devis sauvegardé.
- `src/features/emails/services/` : rendu templates email et payloads n8n.
- `src/features/emails/templates/` : templates HTML transactionnels.
- `src/lib/quotes/quote-service.integration.test.ts` : test d'intégration Supabase local.
- `src/lib/leads/lead-service.ts` : lecture lead et transitions de statuts.
- `src/lib/audit/audit-service.ts` : écriture des logs d'audit.
- `docs/prompt-system.md` : contrat du prompt système.
- `docs/golden-set.md` : scénarios de validation agent.
- `supabase/schema.sql` : tables minimales du MVP.
- `supabase/migrations/` : migrations utilisées par la CLI Supabase locale.
- `supabase/seed.sql` : matrice tarifaire v1 et routes de démonstration.
