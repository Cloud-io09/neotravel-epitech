import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

/**
 * Commercial outcome of a quote.
 *
 * Production keeps the quote lifecycle separate from client intent:
 * - quote.status tracks readiness/sending/final closure;
 * - lead.status + humanReviewReason track client intent and final commercial outcome.
 */
export function isQuoteInterestedIntent(lead: Lead | undefined): boolean {
  return lead?.status === "HUMAN_REVIEW" && lead.humanReviewReason === "QUOTE_ACCEPTED_INTENT";
}

export function isQuoteRefusedIntent(lead: Lead | undefined): boolean {
  return lead?.status === "HUMAN_REVIEW" && lead.humanReviewReason === "QUOTE_REFUSED_INTENT";
}

export function isWonQuote(quote: Quote, lead: Lead | undefined): boolean {
  return quote.status === "ACCEPTED" || lead?.status === "WON";
}

export function isLostQuote(quote: Quote, lead: Lead | undefined): boolean {
  return quote.status === "REFUSED" || lead?.status === "LOST";
}

/** Display label + canonical status for a StatusBadge, derived from quote + lead. */
export function quoteOutcomeDisplay(quote: Quote, lead: Lead | undefined): { label: string; status: string } {
  if (isWonQuote(quote, lead)) return { label: "Accepté", status: "WON" };
  if (isLostQuote(quote, lead)) return { label: "Refusé", status: "LOST" };
  if (isQuoteInterestedIntent(lead)) return { label: "Intéressé", status: "QUOTE_ACCEPTED_INTENT" };
  if (isQuoteRefusedIntent(lead)) return { label: "Pas intéressé", status: "QUOTE_REFUSED_INTENT" };
  if (quote.status === "QUOTE_SENT") return { label: "Envoyé", status: "QUOTE_SENT" };
  return { label: "Prêt", status: "QUOTE_READY" };
}
