import type { QuoteCalculation } from "@/shared/types/quote";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { createQuoteRecord } from "@/shared/lib/data/quoteRepository";

export async function generateQuote(input: { demand: { id?: string; leadId?: string } & Record<string, unknown>; calculation: QuoteCalculation }) {
 const quote = await createQuoteRecord({
  leadId: input.demand.leadId ?? input.demand.id ?? "lead_demo_1",
  status: "QUOTE_READY",
  calculation: input.calculation
 });
 await createAuditLog({
  entityType: "quote",
  entityId: quote.id,
  action: auditActions.quoteGenerated,
  actor: "system",
  input: { leadId: quote.leadId },
  output: { quoteId: quote.id, status: quote.status, totalAmount: quote.calculation.totalAmount },
  payload: {
   leadId: quote.leadId,
   status: quote.status,
   totalAmount: quote.calculation.totalAmount,
   currency: quote.calculation.currency
  }
 });
 return quote;
}
