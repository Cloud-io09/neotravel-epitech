import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

export type QuoteOutcome = "won" | "lost" | "sent" | "ready";

/**
 * Derives a quote's commercial outcome.
 *
 * The two data modes disagree on where the won/lost signal lives:
 * - Demo fixtures put it on the quote itself (`ACCEPTED` / `REFUSED`).
 * - Production stores every finalized quote as `CLOSED` and records won/lost on the
 *   LEAD (`WON` / `LOST`), because accept and refuse both close the quote.
 *
 * Counting `quote.status === "ACCEPTED"` therefore silently returns 0 in production.
 * This helper reads both signals so the dashboards are correct in either mode.
 */
export function getQuoteOutcome(quote: Quote, lead: Lead | undefined): QuoteOutcome {
  if (quote.status === "ACCEPTED" || lead?.status === "WON") return "won";
  if (quote.status === "REFUSED" || lead?.status === "LOST") return "lost";
  if (quote.status === "QUOTE_SENT") return "sent";
  return "ready";
}

export function isWon(quote: Quote, lead: Lead | undefined): boolean {
  return getQuoteOutcome(quote, lead) === "won";
}
