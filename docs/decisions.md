# Décisions — NeoTravel MVP

## 2026-06-24 — Socle Supabase sans dépendance client

- Le schéma SQL et les seeds sont fournis dans `supabase/`.
- `calculer_devis()` reste pur et ne lit/écrit pas Supabase.
- La table d'observabilité IA n'est pas créée en Sprint 1.
- `@supabase/supabase-js` n'est pas installé tant que le front/API Next.js n'en a pas besoin.

## 2026-06-29 — Sécurité RLS deny-all

- Migration `20260629110000_enable_rls_lockdown.sql` : RLS activée sans policy sur toutes les
  tables → `anon` et `authenticated` n'ont aucun accès direct.
- Tout accès données légitime passe par le `service_role` côté serveur (contourne la RLS).
- Règle d'or : toute nouvelle table publique **doit** activer la RLS dans sa migration.

## 2026-06-29 — Comptes client via Supabase Auth

- Les comptes client sont adossés à Supabase Auth, tagués `app_metadata.role = "client"`.
- Lien `clients.auth_user_id` (migration `20260629130000_clients_auth_user_id.sql`) ;
  le serveur scope les données au client connecté, RLS deny-all inchangée.
- Rôle posé à l'inscription (`registerClientAccount.ts`), vérifié au login (`/api/auth/client-login`).
- Le staff (dashboard) est distingué du client par l'absence de `role = "client"`.

## 2026-06-29 — Relances J+1 / J+3 / J+7

- Trois relances après envoi du devis : `FOLLOWUP_1` (J+1), `FOLLOWUP_2` (J+3), `FOLLOWUP_3` (J+7).
- Cas urgent (départ 48 h–7 j) : une seule relance J+1. Départ < 48 h : pas de relance, escalade humaine.
- Orchestration via cron n8n appelant `POST /api/followups/send-due` ; mode démo accéléré disponible.
- Statuts DB en minuscules, normalisés en MAJUSCULES côté domaine (frontière dans
  `followupRepository.ts`) ; les requêtes brutes restent tolérantes à la casse.

## 2026-06-30 — Provider IA : Vercel AI Gateway / OpenRouter

- `getChatModel()` (`src/lib/ai/provider.ts`) : Vercel AI Gateway si `AI_GATEWAY_API_KEY`,
  sinon OpenRouter si `AI_API_KEY`. Abandon de la config Gemini directe.
- Les garde-fous déterministes (extraction, validation, pricing) restent indépendants du modèle.

## 2026-06-30 — Devis PDF (rendu HTML + repli vectoriel)

- `generateQuotePdf.ts` : rendu HTML via navigateur headless (détecté sur macOS/Linux/Windows ou
  `NEOTRAVEL_PDF_BROWSER`), repli vectoriel déterministe si aucun navigateur (serverless).
- Le trajet du PDF inclut les arrêts intermédiaires (`Départ → escales → Arrivée`).
- Le PDF ne calcule jamais de prix : il rend le devis déjà calculé.

## 2026-06-30 — Arrêts intermédiaires orthogonaux au `trip_type`

- `trip_type` ne vaut que `one_way` ou `round_trip` ; l'arrêt intermédiaire est un champ séparé
  (`has_intermediate_stop` + `intermediate_stops`), détecté par `detectIntermediateStops`.
- Un trajet avec arrêt part en `HUMAN_REVIEW` (le moteur direct ne sait pas le tarifer) ; le
  commercial valide l'itinéraire, ce qui lève le garde-fou pour générer et envoyer le devis.
- La question FR du type de trajet est binaire (« aller simple ou aller-retour ») comme les autres
  langues — l'ancienne 3e option « avec arrêts » laissait `trip_type = null` et bloquait l'envoi.
- Le trajet complet (`Départ → escales → Arrivée`) est affiché partout : dashboard, vue devis,
  PDF et payload email.
- **Limite assumée** : `calculer_devis()` ne tarife qu'un trajet direct. Pour un trajet avec
  arrêts, le montant auto est estimé sur la distance directe (le détour n'est pas chiffré) et
  le commercial confirme le montant final. La vue devis affiche une note explicite au client,
  le PDF porte déjà « Montant à confirmer ». Un moteur multi-étapes est hors périmètre MVP.

## 2026-06-30 — Nettoyage du code mort

- Suppression de ~96 fichiers scaffold orphelins (zéro importeur, confirmé par knip + tsc/build/tests).
- Dossiers entièrement retirés : `src/shared/lib/pricing`, `src/shared/components`.
- Nettoyage partiel (seuls les fichiers non câblés retirés, fichiers vivants conservés) :
  `src/shared/lib/{ai,n8n,supabase}`, `src/features/ai-orchestration`, `src/shared/types`,
  et schemas/actions/components non câblés de plusieurs features (demand, quote, followups,
  human-review, partners, dashboard, lead-detail).
- `scripts/seed-demo-data.ts` conservé (outil de seed manuel).
