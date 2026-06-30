import { GenerateQuoteForLeadSchema, generateQuoteForLead } from "@/features/quote/services/generateQuoteForLead";
import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

export async function POST(request: Request) {
 try {
  if (!(await isAdminAuthorized())) {
   return jsonError("UNAUTHORIZED", "Connexion requise.", 401);
  }
  const body = GenerateQuoteForLeadSchema.parse(await request.json());
  return jsonOk(await generateQuoteForLead(body), { status: 201 });
 } catch (error) {
  return handleApiError(error);
 }
}
