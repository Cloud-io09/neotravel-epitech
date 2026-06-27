import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Single read-only source for the operational dashboard. Everything here comes
 * straight from Supabase — no mock data, no invented metrics. If a value is not
 * present in the DB it is left null and rendered as "—" by the UI.
 */

// Pipeline statuses shown in the overview, in chain order. A lead whose status
// isn't in this list still counts in `total`.
export const PIPELINE_STATUSES = [
  "NEW",
  "INCOMPLETE",
  "QUALIFIED",
  "QUOTE_READY",
  "QUOTE_SENT",
  "FOLLOWUP_SCHEDULED",
  "HUMAN_REVIEW",
  "WON",
  "LOST",
  "CLOSED",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export type PipelineLead = {
  id: string;
  organization: string | null;
  email: string | null;
  departureCity: string | null;
  arrivalCity: string | null;
  departureDate: string | null;
  passengerCount: number | null;
  tripType: string | null;
  status: string;
  missingFields: string[];
  humanReviewReason: string | null;
  quoteId: string | null;
  quoteAmountTtc: number | null;
  nextFollowupAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PipelineQuote = {
  id: string;
  leadId: string | null;
  quoteNumber: string;
  priceHt: number | null;
  priceTtc: number | null;
  distanceKm: number | null;
  deterministicHash: string | null;
  status: string;
  createdAt: string | null;
};

export type PipelineFollowup = {
  leadId: string | null;
  quoteId: string | null;
  scheduledAt: string;
  channel: string;
  status: string;
};

export type PipelineAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string | null;
  metadata: Record<string, unknown>;
};

export type PipelineData = {
  leads: PipelineLead[];
  statusCounts: Record<string, number>;
  total: number;
  quotes: PipelineQuote[];
  followups: PipelineFollowup[];
  auditLogs: PipelineAuditLog[];
};

export async function getPipelineData(): Promise<PipelineData> {
  const supabase = createServerSupabaseClient();

  const [leadsResult, quotesResult, followupsResult, auditResult] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, departure_city, arrival_city, departure_date, passenger_count, trip_type, status, missing_fields, human_review_reason, created_at, updated_at, clients(organization, email)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id, lead_id, quote_number, price_ht, price_ttc, distance_km, deterministic_hash, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("followups")
      .select("lead_id, quote_id, scheduled_at, channel, status")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("audit_logs")
      .select("id, entity_type, entity_id, action, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  if (leadsResult.error) throw new Error(`Unable to load leads: ${leadsResult.error.message}`);
  if (quotesResult.error) throw new Error(`Unable to load quotes: ${quotesResult.error.message}`);
  if (followupsResult.error) throw new Error(`Unable to load followups: ${followupsResult.error.message}`);
  if (auditResult.error) throw new Error(`Unable to load audit logs: ${auditResult.error.message}`);

  const quotes: PipelineQuote[] = (quotesResult.data ?? []).map((quote) => ({
    id: quote.id,
    leadId: quote.lead_id,
    quoteNumber: quote.quote_number,
    priceHt: quote.price_ht != null ? Number(quote.price_ht) : null,
    priceTtc: quote.price_ttc != null ? Number(quote.price_ttc) : null,
    distanceKm: quote.distance_km != null ? Number(quote.distance_km) : null,
    deterministicHash: quote.deterministic_hash ?? null,
    status: quote.status,
    createdAt: quote.created_at ?? null,
  }));

  const followups: PipelineFollowup[] = (followupsResult.data ?? []).map((followup) => ({
    leadId: followup.lead_id,
    quoteId: followup.quote_id,
    scheduledAt: followup.scheduled_at,
    channel: followup.channel,
    status: followup.status,
  }));

  // Latest quote per lead (quotes are already sorted newest-first).
  const quoteByLead = new Map<string, PipelineQuote>();
  for (const quote of quotes) {
    if (quote.leadId && !quoteByLead.has(quote.leadId)) quoteByLead.set(quote.leadId, quote);
  }

  // Earliest still-scheduled followup per lead (followups sorted by date asc).
  const nextFollowupByLead = new Map<string, string>();
  for (const followup of followups) {
    if (followup.leadId && followup.status === "scheduled" && !nextFollowupByLead.has(followup.leadId)) {
      nextFollowupByLead.set(followup.leadId, followup.scheduledAt);
    }
  }

  const leads: PipelineLead[] = (leadsResult.data ?? []).map((lead) => {
    const client = Array.isArray(lead.clients) ? lead.clients[0] : lead.clients;
    const quote = quoteByLead.get(lead.id);

    return {
      id: lead.id,
      organization: client?.organization ?? null,
      email: client?.email ?? null,
      departureCity: lead.departure_city,
      arrivalCity: lead.arrival_city,
      departureDate: lead.departure_date,
      passengerCount: lead.passenger_count,
      tripType: lead.trip_type,
      status: lead.status,
      missingFields: (lead.missing_fields as string[] | null) ?? [],
      humanReviewReason: lead.human_review_reason,
      quoteId: quote?.id ?? null,
      quoteAmountTtc: quote?.priceTtc ?? null,
      nextFollowupAt: nextFollowupByLead.get(lead.id) ?? null,
      createdAt: lead.created_at ?? null,
      updatedAt: lead.updated_at ?? null,
    };
  });

  const statusCounts: Record<string, number> = {};
  for (const lead of leads) {
    statusCounts[lead.status] = (statusCounts[lead.status] ?? 0) + 1;
  }

  const auditLogs: PipelineAuditLog[] = (auditResult.data ?? []).map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    createdAt: log.created_at ?? null,
    metadata: (log.metadata ?? {}) as Record<string, unknown>,
  }));

  return {
    leads,
    statusCounts,
    total: leads.length,
    quotes,
    followups,
    auditLogs,
  };
}
