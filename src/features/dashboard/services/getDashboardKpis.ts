import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";

export async function getDashboardKpis() {
 const [leads, quotes, followups] = await Promise.all([listLeads(), listQuotes(), listFollowups()]);

 return {
  newLeads: leads.filter((lead) => lead.status === "NEW").length,
  quoteReady: quotes.filter((quote) => quote.status === "QUOTE_READY").length,
  humanReview: leads.filter((lead) => lead.status === "HUMAN_REVIEW").length,
  followupsScheduled: followups.filter((followup) => followup.status === "SCHEDULED").length
 };
}
