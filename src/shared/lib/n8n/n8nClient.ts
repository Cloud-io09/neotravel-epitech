export async function n8nClient(workflow: string, payload: unknown) {
 const webhookByWorkflow: Record<string, string | undefined> = {
  "send-quote": process.env.N8N_SEND_QUOTE_WEBHOOK,
  followup: process.env.N8N_FOLLOWUP_WEBHOOK,
  "human-review-notify": process.env.N8N_HUMAN_REVIEW_WEBHOOK,
  "daily-digest": process.env.N8N_DAILY_DIGEST_WEBHOOK
 };
 const webhookUrl = webhookByWorkflow[workflow] ?? (process.env.N8N_BASE_URL ? `${process.env.N8N_BASE_URL}/${workflow}` : undefined);

 if (!webhookUrl) {
  return {
   workflow,
   simulated: true,
   payload
  };
 }

 const response = await fetch(webhookUrl, {
  method: "POST",
  headers: {
   "content-type": "application/json",
   ...(process.env.N8N_WEBHOOK_SECRET ? { "x-neotravel-webhook-secret": process.env.N8N_WEBHOOK_SECRET } : {})
  },
  body: JSON.stringify(payload)
 });

 return {
  workflow,
  simulated: false,
  status: response.status,
  ok: response.ok
 };
}
