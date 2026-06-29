# n8n workflows — NeoTravel emails & relances

Importable workflows for the customer-email + relance (follow-up) pipeline.

Relance rules (decided), scheduled automatically when a quote email is sent and delivered
when the n8n cron calls `/api/followups/send-due`:

| Cas | Condition (départ vs maintenant) | Tag dashboard | Relances |
|-----|----------------------------------|---------------|----------|
| Standard | départ > 7j | — | **J+1, J+3, J+7** (`FOLLOWUP_J1/J3/J7`) → `FOLLOWUP_1/2/3` → `CLOSED` |
| Urgent | départ 48h–7j | « Urgent » | **J+1 unique** (`FOLLOWUP_J1`) |
| Très urgent | départ ≤ 48h | « Très urgent » | **aucune** → `HUMAN_REVIEW` |

> Orchestration & transport are delegated to n8n: the cron decides *when* to sweep, the
> webhook *sends* the email. The app stays the source of truth (what's due, which template,
> status transitions, dedup) behind `/api/followups/send-due`. There is **no in-app
> scheduler** — both demo and prod cadences run from n8n.
>
> Prod prerequisite: apply the `FOLLOWUP_3` status migration
> (`supabase/migrations/20260629120000_leads_add_followup_3_status.sql`) via `supabase db push`
> before relying on the standard 3-step sequence. The app degrades gracefully
> (`FOLLOWUP_3 → FOLLOWUP_SCHEDULED`) if it is missing, but the precise status needs it.

## Import
In n8n: new workflow → top-right **⋯ menu → Import from File** (or paste the JSON on the
canvas) → pick the file.

## 1. `neotravel-customer-email.workflow.json`
Receives the already-rendered email from the app and sends it by SMTP (html + text).

Replace after import:
- **Check secret** node → `REPLACE_WITH_N8N_WEBHOOK_SECRET` (must equal `N8N_WEBHOOK_SECRET` in the app env).
- **Send Email** node → `REPLACE_WITH_YOUR_SENDER@gmail.com` (From address) and attach an **SMTP credential** (Gmail: `smtp.gmail.com`, port `465`, SSL on, your Gmail, 16-char App Password).

**Activate**, then copy the Webhook **Production URL** into the app env as
`N8N_CUSTOMER_EMAIL_WEBHOOK`.

The app POSTs this body (already rendered — n8n only delivers it):
`{ to: { email, name }, subject, preheader, html, text, scenario, template, lead, quote?, followup? }`
with header `x-neotravel-webhook-secret`. In n8n the body is under `$json.body`, the header
under `$json.headers`.

## 2. `neotravel-relances.workflow.json` (PROD)
Daily cron (09:00) that triggers any due J+1 / J+3 / J+7 relances (sends `{ "limit": 100 }`).

Replace in **Send due followups**: `REPLACE_WITH_YOUR_APP_URL` and `REPLACE_WITH_N8N_WEBHOOK_SECRET`.
**Activate**. Calls `POST /api/followups/send-due` once per day.

## 3. `neotravel-relances-demo.workflow.json` (DEMO)
Same call, but a **1-minute** schedule — for live demos where relances must fire every minute.
Replace the same two placeholders, **Activate**, and **deactivate the PROD cron** while
demoing so they don't overlap. Sends `{ "limit": 50 }` so a demo batch is fully drained.

> Idempotence: `send-due` only sends followups still in `scheduled` status and dedupes via
> `audit_logs`, so hitting it every minute never double-sends.

## Demo runbook (relances ~every minute)
1. App env: set `DEMO_FAST_FOLLOWUP=true` (schedules J1 → +1 min, J3 → +2 min, J7 → +3 min
   instead of J+1/J+3/J+7, and compresses the closure grace to ~1 min), plus
   `N8N_CUSTOMER_EMAIL_WEBHOOK`, `N8N_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`.
2. Import + activate **customer-email** and **relances-demo** workflows (placeholders filled).
3. Create a lead with a quote whose client email is a real test inbox, then **send the quote**
   (dashboard "Envoyer le devis") → this schedules the J2/J7 relances.
4. Watch: within ~1–2 min the demo cron drains the due relances → real emails arrive, and
   `/dashboard/relances` flips them `scheduled → sent`; the lead advances
   `QUOTE_SENT → FOLLOWUP_1 → FOLLOWUP_2 → FOLLOWUP_3 → CLOSED`.

## App env recap
```
NEXT_PUBLIC_APP_URL=https://<your-app-url>
N8N_CUSTOMER_EMAIL_WEBHOOK=https://<your-n8n>/webhook/neotravel-customer-email
N8N_WEBHOOK_SECRET=<shared-secret>
DEMO_FAST_FOLLOWUP=true   # demo only — short J2/J7 delays
```
Until `N8N_CUSTOMER_EMAIL_WEBHOOK` is set, the app runs in simulated mode (logs to
`audit_logs`, sends nothing).
