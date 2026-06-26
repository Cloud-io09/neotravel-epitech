import {
  QuoteActionParamsSchema,
  QuoteChangeRequestSchema,
  requestQuoteChange
} from "@/features/quote/services/quoteClientActions";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";

export async function POST(request: Request, context: { params: Promise<{ quoteId: string }> }) {
  try {
    const params = QuoteActionParamsSchema.parse(await context.params);
    const body = QuoteChangeRequestSchema.parse(await request.json());
    return jsonOk(await requestQuoteChange(params.quoteId, body));
  } catch (error) {
    return handleApiError(error);
  }
}
