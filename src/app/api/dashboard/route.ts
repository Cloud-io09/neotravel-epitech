import { getDashboardKpis } from "@/features/dashboard/services/getDashboardKpis";
import { getPipelineLeads } from "@/features/dashboard/services/getPipelineLeads";
import { listFollowups, listQuotes } from "@/shared/lib/data";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    kpis: await getDashboardKpis(),
    leads: await getPipelineLeads(),
    quotes: await listQuotes(),
    followups: await listFollowups()
  });
}
