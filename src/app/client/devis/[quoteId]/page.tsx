import { QuoteClientView } from "@/features/quote/components/QuoteClientView";

export default async function QuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  return <QuoteClientView quoteId={quoteId} viewer="client" />;
}
