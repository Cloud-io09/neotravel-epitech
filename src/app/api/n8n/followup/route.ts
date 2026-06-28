export const runtime = "nodejs";

import { sendFollowupEmail } from "@/features/emails/services/customerEmailService";
import { isN8nRequestAuthorized } from "@/shared/lib/n8n/authorizeN8nRequest";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";
import { z } from "zod";

const FollowupSchema = z.object({
  followupId: z.string().uuid(),
  force: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    if (!(await isN8nRequestAuthorized(request))) {
      return jsonError("UNAUTHORIZED", "Secret n8n ou session admin requis.", 401);
    }

    const body = FollowupSchema.parse(await request.json());
    return jsonOk(await sendFollowupEmail({ followupId: body.followupId, triggeredBy: "n8n", force: body.force }));
  } catch (error) {
    return handleApiError(error);
  }
}
