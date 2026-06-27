import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";
import { getDashboardKpis } from "@/features/dashboard/services/getDashboardKpis";
import { getPipelineLeads } from "@/features/dashboard/services/getPipelineLeads";
import { listFollowups, listQuotes } from "@/shared/lib/data";
import { jsonError } from "@/shared/lib/utils/apiResponse";

export async function GET() {
 if (!(await isAdminAuthorized())) {
  return jsonError("UNAUTHORIZED", "Connexion administrateur requise.", 401);
 }

 return Response.json({
  kpis: await getDashboardKpis(),
  leads: await getPipelineLeads(),
  quotes: await listQuotes(),
  followups: await listFollowups()
 });
}
