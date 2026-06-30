import { z } from "zod";
import { sendQuoteAvailableEmail } from "@/features/emails/services/customerEmailService";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit/audit-service";
import { calculateQuoteForLead } from "@/lib/quotes/quote-service";
import { isAdminAuthorized } from "@/shared/lib/auth/requireAdmin";

export const runtime = "nodejs";

const ResolveSchema = z.object({
  targetStatus: z.enum(["QUALIFIED", "INCOMPLETE", "LOST"]),
  notes: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> },
): Promise<Response> {
  try {
    if (!(await isAdminAuthorized())) {
      return Response.json({ error: "Non autorisé." }, { status: 401 });
    }

    const { leadId } = await params;
    const parsed = ResolveSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Payload invalide." }, { status: 400 });

    const { targetStatus, notes } = parsed.data;
    const supabase = createServerSupabaseClient();

    if (targetStatus === "QUALIFIED") {
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .select("id, departure_city, arrival_city, departure_date, return_date, passenger_count, trip_type, has_intermediate_stop, intermediate_stops, clients(email)")
        .eq("id", leadId)
        .single();

      if (leadError) return Response.json({ error: leadError.message }, { status: 500 });

      const missingFields = getMissingQuoteSendFields(lead as LeadResolutionRow);
      if (missingFields.length > 0) {
        return Response.json(
          {
            error: {
              code: "LEAD_INCOMPLETE",
              message: `Complétez la demande avant validation : ${missingFields.join(", ")}.`,
              details: { missingFields },
            },
          },
          { status: 422 },
        );
      }
    }

    const update: Record<string, unknown> = { status: targetStatus };
    if (targetStatus === "QUALIFIED") {
      update.human_review_reason = null;
      update.missing_fields = [];
    }
    if (notes) update.human_review_notes = notes;

    const { error } = await supabase.from("leads").update(update).eq("id", leadId);
    if (error) {
      if (!notes || !isMissingColumnError(error)) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      const fallback = await supabase
        .from("leads")
        .update({ status: targetStatus })
        .eq("id", leadId);
      if (fallback.error) return Response.json({ error: fallback.error.message }, { status: 500 });
    }

    await logAuditEvent({
      entityType: "lead",
      entityId: leadId,
      action: "HUMAN_REVIEW_RESOLVED",
      metadata: { targetStatus, notes: notes ?? null },
    });

    if (targetStatus !== "QUALIFIED") {
      return Response.json({ leadId, status: targetStatus });
    }

    const quoteId = await ensureQuoteForLead(supabase, leadId);
    const email = await sendQuoteAvailableEmail({ quoteId, triggeredBy: "dashboard" });

    await logAuditEvent({
      entityType: "quote",
      entityId: quoteId,
      action: "HUMAN_REVIEW_QUOTE_SENT",
      metadata: { leadId, email },
    });

    return Response.json({ leadId, status: "QUOTE_SENT", quoteId, email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action impossible, réessayez.";
    return Response.json({ error: { code: "HUMAN_REVIEW_RESOLVE_FAILED", message } }, { status: 409 });
  }
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  return error.code === "42703" || /column .* does not exist/i.test(error.message ?? "");
}

type LeadResolutionRow = {
  departure_city: string | null;
  arrival_city: string | null;
  departure_date: string | null;
  return_date: string | null;
  passenger_count: number | null;
  trip_type: "one_way" | "round_trip" | null;
  clients?: { email: string | null } | { email: string | null }[] | null;
};

function getMissingQuoteSendFields(lead: LeadResolutionRow) {
  const missingFields: string[] = [];
  const client = Array.isArray(lead.clients) ? lead.clients[0] : lead.clients;

  if (!hasText(client?.email)) missingFields.push("email");
  if (!hasText(lead.departure_city)) missingFields.push("departure_city");
  if (!hasText(lead.arrival_city)) missingFields.push("arrival_city");
  if (!hasText(lead.departure_date)) missingFields.push("departure_date");
  if (!Number.isFinite(lead.passenger_count)) missingFields.push("passenger_count");
  if (lead.trip_type !== "one_way" && lead.trip_type !== "round_trip") missingFields.push("trip_type");
  if (lead.trip_type === "round_trip" && !hasText(lead.return_date)) missingFields.push("return_date");

  return missingFields;
}

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

async function ensureQuoteForLead(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  leadId: string,
) {
  const { data: existingQuote, error: quoteError } = await supabase
    .from("quotes")
    .select("id")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (quoteError) throw new Error(`Impossible de lire le devis existant : ${quoteError.message}`);
  if (existingQuote?.id) return existingQuote.id as string;

  // The commercial has manually reviewed and validated the itinerary here, so the
  // intermediate-stop guardrail (which only protects the automatic/client paths) is lifted.
  const result = await calculateQuoteForLead(leadId, {}, { allowIntermediateStop: true });
  if (!result.ok) {
    throw new Error(`Devis automatique impossible après validation : ${result.reason}`);
  }

  return result.quoteId;
}
