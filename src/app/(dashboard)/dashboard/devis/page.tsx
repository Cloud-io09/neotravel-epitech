import { QuotesDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function DashboardQuotesPage() {
 await requirePermission("quotes");
 return <QuotesDashboardPage />;
}
