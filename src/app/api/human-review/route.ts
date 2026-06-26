import { createHumanReview } from "@/features/human-review/services/createHumanReview";
import { listLeads } from "@/shared/lib/data";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

export async function GET() {
  const leads = await listLeads();
  return Response.json(leads.filter((l) => l.status === "HUMAN_REVIEW"));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return jsonOk(await createHumanReview(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
