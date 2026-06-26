import { scheduleFollowups } from "@/features/followups/services/scheduleFollowups";
import { listFollowups } from "@/shared/lib/data";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";
import { z } from "zod";

export const runtime = "nodejs";

const ScheduleSchema = z.object({
  leadId: z.string().min(1),
  quoteId: z.string().min(1).optional(),
  isUrgent: z.boolean().optional(),
  highValue: z.boolean().optional()
});

export async function GET() {
  return Response.json(await listFollowups());
}

export async function POST(request: Request) {
  try {
    const body = ScheduleSchema.parse(await request.json());
    return jsonOk(await scheduleFollowups(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
