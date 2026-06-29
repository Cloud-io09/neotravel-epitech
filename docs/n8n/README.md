# n8n workflows — NeoTravel emails

Importable workflows for the customer-email pipeline.

## Import
In n8n: open a new workflow → top-right **⋯ menu → Import from File** (or paste the
JSON on the canvas) → pick the file.

## 1. `neotravel-customer-email.workflow.json`
Receives the rendered email from the app and sends it by SMTP.

Replace these placeholders after import:
- **Check secret** node → `REPLACE_WITH_N8N_WEBHOOK_SECRET` (must equal `N8N_WEBHOOK_SECRET` in the app env).
- **Send Email** node → `REPLACE_WITH_YOUR_SENDER@gmail.com` (the From address) and attach an **SMTP credential** (Gmail: `smtp.gmail.com`, port `465`, SSL on, your Gmail, 16-char App Password).

Then **Activate** the workflow and copy the Webhook **Production URL** into the app env as
`N8N_CUSTOMER_EMAIL_WEBHOOK`.

The app POSTs this body (already rendered — n8n only delivers it):
`{ to: { email, name }, subject, preheader, html, text, scenario, template, lead, quote?, followup? }`
with header `x-neotravel-webhook-secret`.

## 2. `neotravel-relances.workflow.json`
Daily cron that triggers any due J+2 / J+7 relances.

Replace:
- **Send due followups** node → `REPLACE_WITH_YOUR_APP_URL` (e.g. `https://neotravel.vercel.app`) and `REPLACE_WITH_N8N_WEBHOOK_SECRET`.

Then **Activate**. It calls `POST /api/followups/send-due` every day at 09:00.

## App env recap
```
NEXT_PUBLIC_APP_URL=https://<your-app-url>
N8N_CUSTOMER_EMAIL_WEBHOOK=https://<your-n8n>/webhook/neotravel-customer-email
N8N_WEBHOOK_SECRET=<shared-secret>
```
Until `N8N_CUSTOMER_EMAIL_WEBHOOK` is set the app runs in simulated mode (logs to
`audit_logs`, sends nothing).
