export const runtime = "nodejs";

import { sendDueFollowupEmails } from "@/features/emails/services/customerEmailService";
import { isN8nRequestAuthorized } from "@/shared/lib/n8n/authorizeN8nRequest";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";
import { z } from "zod";

const SendDueSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  now: z.string().datetime().optional(),
}).optional();

export async function POST(request: Request) {
  try {
    if (!(await isN8nRequestAuthorized(request))) {
      return jsonError("UNAUTHORIZED", "Secret n8n ou session admin requis.", 401);
    }

    const body = SendDueSchema.parse(await request.json().catch(() => undefined));
    return jsonOk(
      await sendDueFollowupEmails({
        limit: body?.limit,
        now: body?.now ? new Date(body.now) : undefined,
        triggeredBy: "n8n",
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
