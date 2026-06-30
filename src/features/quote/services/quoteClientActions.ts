import { z } from "zod";

import { logAuditEvent } from "@/lib/audit/audit-service";
import { markHumanReview } from "@/lib/leads/lead-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AppError } from "@/shared/lib/utils/errors";

export const QuoteActionParamsSchema = z.object({
  quoteId: z.string().uuid(),
});

export const QuoteChangeRequestSchema = z.object({
  message: z.string().min(1),
  requestedBy: z.string().optional(),
});

type StoredQuote = {
  id: string;
  lead_id: string | null;
  status: "QUOTE_READY" | "QUOTE_SENT" | "CLOSED";
};

async function requireQuote(quoteId: string): Promise<StoredQuote> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .select("id, lead_id, status")
    .eq("id", quoteId)
    .maybeSingle();

  if (error) throw new AppError("Lecture du devis impossible.", "NOT_FOUND");
  if (!data?.lead_id) throw new AppError("Devis introuvable.", "NOT_FOUND");

  return data as StoredQuote;
}

function assertQuoteOpenForClientIntent(status: StoredQuote["status"]) {
  // A client can express an intent on their generated estimate (QUOTE_READY) or on an
  // officially sent devis (QUOTE_SENT). Only a finalized devis is closed to new intents.
  if (status !== "QUOTE_READY" && status !== "QUOTE_SENT") {
    throw new AppError("Devis déjà finalisé.", "QUOTE_FINALIZED");
  }
  if (status !== "QUOTE_SENT") {
    throw new AppError("Le devis doit être envoyé avant de recueillir une intention client.", "QUOTE_NOT_SENT");
  }
}

async function suspendScheduledFollowups(quote: StoredQuote, reason: "QUOTE_ACCEPTED_INTENT" | "QUOTE_REFUSED_INTENT") {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase
    .from("followups")
    .update({ status: "cancelled" })
    .eq("quote_id", quote.id)
    .eq("status", "scheduled");

  if (error) throw new AppError("Suspension des relances impossible.", "FOLLOWUP_SUSPEND_FAILED");

  await logAuditEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "FOLLOWUPS_SUSPENDED_AFTER_CLIENT_INTENT",
    metadata: { leadId: quote.lead_id, reason },
  });
}

export async function acceptQuote(quoteId: string) {
  const quote = await requireQuote(quoteId);
  assertQuoteOpenForClientIntent(quote.status);
  await suspendScheduledFollowups(quote, "QUOTE_ACCEPTED_INTENT");
  await markHumanReview(quote.lead_id!, "QUOTE_ACCEPTED_INTENT");
  await logAuditEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "QUOTE_ACCEPTED_INTENT_RECORDED",
    metadata: { leadId: quote.lead_id, quoteStatus: quote.status },
  });

  return { id: quote.id, leadId: quote.lead_id, status: quote.status, intent: "INTERESTED" };
}

export async function refuseQuote(quoteId: string) {
  const quote = await requireQuote(quoteId);
  assertQuoteOpenForClientIntent(quote.status);
  await suspendScheduledFollowups(quote, "QUOTE_REFUSED_INTENT");
  await markHumanReview(quote.lead_id!, "QUOTE_REFUSED_INTENT");
  await logAuditEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "QUOTE_REFUSED_INTENT_RECORDED",
    metadata: { leadId: quote.lead_id, quoteStatus: quote.status },
  });

  return { id: quote.id, leadId: quote.lead_id, status: quote.status, intent: "NOT_INTERESTED" };
}

export async function requestQuoteChange(
  quoteId: string,
  input: z.infer<typeof QuoteChangeRequestSchema>,
) {
  const quote = await requireQuote(quoteId);
  assertQuoteOpenForClientIntent(quote.status);
  await markHumanReview(quote.lead_id!, "QUOTE_CHANGE_REQUEST");
  await logAuditEvent({
    entityType: "quote",
    entityId: quote.id,
    action: "QUOTE_CHANGE_REQUESTED",
    metadata: {
      leadId: quote.lead_id,
      requestedBy: input.requestedBy,
      messageLength: input.message.length,
    },
  });

  return { quoteId, leadId: quote.lead_id, status: "HUMAN_REVIEW" };
}
