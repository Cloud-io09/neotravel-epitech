import { acceptQuote, QuoteActionParamsSchema } from "@/features/quote/services/quoteClientActions";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";

export async function POST(_request: Request, context: { params: Promise<{ quoteId: string }> }) {
  try {
    const params = QuoteActionParamsSchema.parse(await context.params);
    return jsonOk(await acceptQuote(params.quoteId));
  } catch (error) {
    return handleApiError(error);
  }
}
