export const runtime = "nodejs";

import { sendFollowupEmail } from "@/features/emails/services/customerEmailService";
import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";
import { z } from "zod";

const ParamsSchema = z.object({ followupId: z.string().uuid() });

export async function POST(_request: Request, context: { params: Promise<{ followupId: string }> }) {
  try {
    if (!(await isAdminAuthorized())) {
      return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
    }

    const { followupId } = ParamsSchema.parse(await context.params);
    return jsonOk(await sendFollowupEmail({ followupId, triggeredBy: "dashboard" }));
  } catch (error) {
    return handleApiError(error);
  }
}
