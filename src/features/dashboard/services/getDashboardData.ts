import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DashboardLead = {
  id: string;
  organization: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  status: string;
  humanReviewReason: string | null;
};

export type DashboardQuote = {
  id: string;
  leadId: string | null;
  quoteNumber: string;
  priceTtc: number;
  status: string;
};

export type DashboardFollowup = {
  leadId: string | null;
  quoteId: string | null;
  scheduledAt: string;
  channel: string;
  status: string;
};

function normalizeFollowupStatus(status: string) {
  return status.toUpperCase();
}

export async function getDashboardData() {
  const supabase = createServerSupabaseClient();
  const [leadsResult, quotesResult, followupsResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id, departure_city, arrival_city, status, human_review_reason, clients(organization)")
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id, lead_id, quote_number, price_ttc, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("followups")
      .select("lead_id, quote_id, scheduled_at, channel, status")
      .order("scheduled_at", { ascending: true }),
  ]);

  if (leadsResult.error) throw new Error(`Unable to load dashboard leads: ${leadsResult.error.message}`);
  if (quotesResult.error) throw new Error(`Unable to load dashboard quotes: ${quotesResult.error.message}`);
  if (followupsResult.error) {
    throw new Error(`Unable to load dashboard followups: ${followupsResult.error.message}`);
  }

  const leads: DashboardLead[] = (leadsResult.data ?? []).map((lead) => {
    const client = Array.isArray(lead.clients) ? lead.clients[0] : lead.clients;

    return {
      id: lead.id,
      organization: client?.organization ?? null,
      departureCity: lead.departure_city,
      arrivalCity: lead.arrival_city,
      status: lead.status,
      humanReviewReason: lead.human_review_reason,
    };
  });

  const quotes: DashboardQuote[] = (quotesResult.data ?? []).map((quote) => ({
    id: quote.id,
    leadId: quote.lead_id,
    quoteNumber: quote.quote_number,
    priceTtc: Number(quote.price_ttc),
    status: quote.status,
  }));

  const followups: DashboardFollowup[] = (followupsResult.data ?? []).map((followup) => ({
    leadId: followup.lead_id,
    quoteId: followup.quote_id,
    scheduledAt: followup.scheduled_at,
    channel: followup.channel,
    status: normalizeFollowupStatus(followup.status),
  }));

  return { leads, quotes, followups };
}
