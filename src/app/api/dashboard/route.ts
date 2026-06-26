import { getDashboardData } from "@/features/dashboard/services/getDashboardData";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const { leads, quotes, followups } = await getDashboardData();

  return Response.json({
    kpis: {
      newLeads: leads.filter((lead) => lead.status === "NEW").length,
      quoteReady: quotes.filter((quote) => quote.status === "QUOTE_READY").length,
      humanReview: leads.filter((lead) => lead.status === "HUMAN_REVIEW").length,
      followupsScheduled: followups.filter((followup) => followup.status === "scheduled").length,
    },
    leads,
    quotes,
    followups,
  });
}
