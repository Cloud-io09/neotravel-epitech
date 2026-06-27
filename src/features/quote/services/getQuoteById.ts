import { mockQuotes } from "@/data/mock-quotes";
import { getQuoteRecordById } from "@/shared/lib/data/quoteRepository";

export async function getQuoteById(quoteId: string) {
 return (await getQuoteRecordById(quoteId)) ?? mockQuotes.find((quote) => quote.id === quoteId) ?? null;
}
