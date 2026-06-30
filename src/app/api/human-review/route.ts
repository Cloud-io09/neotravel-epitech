import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";
import { createHumanReview } from "@/features/human-review/services/createHumanReview";
import { handleApiError, jsonError, jsonOk } from "@/shared/lib/utils/apiResponse";

export async function POST(request: Request) {
 try {
  if (!(await isAdminAuthorized())) {
   return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
  }

  const body = await request.json();
  return jsonOk(await createHumanReview(body), { status: 201 });
 } catch (error) {
  return handleApiError(error);
 }
}
