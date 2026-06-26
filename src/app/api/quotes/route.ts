import { z } from "zod";

import { calculateQuoteForLead } from "../../../lib/quotes/quote-service";

export const runtime = "nodejs";

const QuoteRequestSchema = z.object({
  leadId: z.string().uuid(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = QuoteRequestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return Response.json({ error: "Payload invalide." }, { status: 400 });
  }

  try {
    const result = await calculateQuoteForLead(parsed.data.leadId);

    if (!result.ok) {
      return Response.json(
        { error: result.reason, status: result.status },
        { status: result.status === "INCOMPLETE" ? 422 : 409 },
      );
    }

    return Response.json({ id: result.quoteId, status: result.status }, { status: 201 });
  } catch {
    return Response.json({ error: "Impossible de générer le devis." }, { status: 500 });
  }
}
