import { z } from "zod";

import { sendQuoteAvailableEmail } from "@/features/emails/services/customerEmailService";

import { getLeadById, markHumanReview, markLeadIncomplete } from "../../../lib/leads/lead-service";
import { calculateQuoteForLead } from "../../../lib/quotes/quote-service";

export const runtime = "nodejs";

// Très urgent: departure within 48h. The devis is generated, but the lead is routed to a
// commercial (human review) instead of letting the client accept/refuse online.
function isDepartureWithinHours(value: string | null | undefined, hours: number) {
  if (!value) return false;
  const departure = new Date(`${value}T12:00:00`).getTime();
  if (Number.isNaN(departure)) return false;
  const diffMs = departure - Date.now();
  return diffMs >= 0 && diffMs <= hours * 60 * 60 * 1000;
}

const QuoteRequestSchema = z.object({
  leadId: z.string().uuid(),
  autoSend: z.boolean().optional().default(false),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = QuoteRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Payload invalide." }, { status: 400 });
  }

  try {
    if (parsed.data.autoSend) {
      const lead = await getLeadById(parsed.data.leadId);
      if (!lead?.email) {
        if (lead) await markLeadIncomplete(parsed.data.leadId, ["email"]);
        return Response.json(
          { error: "NO_RECIPIENT_EMAIL", status: "INCOMPLETE", missingFields: ["email"] },
          { status: 422 },
        );
      }
    }

    const result = await calculateQuoteForLead(parsed.data.leadId);

    if (!result.ok) {
      return Response.json(
        { error: result.reason, status: result.status },
        { status: result.status === "INCOMPLETE" ? 422 : 409 },
      );
    }

    if (!parsed.data.autoSend) {
      // Generate the devis but route très-urgent demands to a commercial.
      const lead = await getLeadById(parsed.data.leadId);
      if (isDepartureWithinHours(lead?.departure_date, 48)) {
        await markHumanReview(parsed.data.leadId, "URGENT_DEPARTURE_UNDER_48H");
        return Response.json({ id: result.quoteId, status: "HUMAN_REVIEW" }, { status: 201 });
      }
      return Response.json({ id: result.quoteId, status: result.status }, { status: 201 });
    }

    const email = await sendQuoteAvailableEmail({ quoteId: result.quoteId, triggeredBy: "system" });
    const status =
      email.reason === "URGENT_DEPARTURE_REQUIRES_HUMAN_REVIEW"
        ? "HUMAN_REVIEW"
        : email.skipped && email.reason !== "QUOTE_ALREADY_SENT"
          ? result.status
          : "QUOTE_SENT";

    return Response.json(
      {
        id: result.quoteId,
        status,
        email,
      },
      { status: 201 },
    );
  } catch {
    return Response.json({ error: "Impossible de générer le devis." }, { status: 500 });
  }
}
