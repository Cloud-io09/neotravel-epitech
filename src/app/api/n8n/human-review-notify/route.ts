export const runtime = "nodejs";

import { triggerHumanReview } from "@/shared/lib/n8n/triggerHumanReview";
import { z } from "zod";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";

const HumanReviewWebhookSchema = z.object({
  leadId: z.string().min(1),
  reason: z.string().min(1),
  summary: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const body = HumanReviewWebhookSchema.parse(await request.json());
    return jsonOk(await triggerHumanReview(body));
  } catch (error) {
    return handleApiError(error);
  }
}