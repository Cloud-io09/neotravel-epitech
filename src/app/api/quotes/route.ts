import { GenerateQuoteForLeadSchema, generateQuoteForLead } from "@/features/quote/services/generateQuoteForLead";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = GenerateQuoteForLeadSchema.parse(await request.json());
    return jsonOk(await generateQuoteForLead(body), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
