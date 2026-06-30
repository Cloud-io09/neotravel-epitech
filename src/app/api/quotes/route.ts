import { z } from "zod";

import { sendQuoteAvailableEmail } from "@/features/emails/services/customerEmailService";

import { getLeadById, markLeadIncomplete } from "../../../lib/leads/lead-service";
import { calculateQuoteForLead } from "../../../lib/quotes/quote-service";

export const runtime = "nodejs";

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
