import { scheduleFollowups } from "@/features/followups/services/scheduleFollowups";
import { z } from "zod";
import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

const ScheduleFollowupsSchema = z.object({
 leadId: z.string().min(1),
 quoteId: z.string().min(1).optional(),
 quoteStatus: z.literal("QUOTE_SENT").optional(),
 isUrgent: z.boolean().optional(),
 highValue: z.boolean().optional()
});

export async function POST(request: Request) {
 try {
  if (!(await isAdminAuthorized())) {
   return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
  }

  const body = ScheduleFollowupsSchema.parse(await request.json());
  return jsonOk(await scheduleFollowups(body), { status: 201 });
 } catch (error) {
  return handleApiError(error);
 }
}
