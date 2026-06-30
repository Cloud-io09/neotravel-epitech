import { QuoteClientView } from "@/features/quote/components/QuoteClientView";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  await requirePermission("quotes");
  const { quoteId } = await params;
  return <QuoteClientView quoteId={quoteId} viewer="admin" />;
}
