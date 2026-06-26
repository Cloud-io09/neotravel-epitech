export const runtime = "nodejs";

import { triggerSendQuote } from "@/shared/lib/n8n/triggerSendQuote";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";

const SendQuoteWebhookSchema = z.object({
  quoteId: z.string().min(1),
  email: z.string().email(),
  preview: z.string().min(1),
  scheduledAt: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const body = SendQuoteWebhookSchema.parse(await request.json());
    return jsonOk(
      await triggerSendQuote({
        quote_id: body.quoteId,
        email: body.email,
        preview: body.preview,
        scheduled_at: body.scheduledAt
      })
    );
  } catch (error) {
    return handleApiError(error);
  }
}