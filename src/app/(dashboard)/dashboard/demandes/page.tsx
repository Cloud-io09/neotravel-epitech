import { CommercialLeadsPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function LeadsPage() {
 await requirePermission("leads");
 return <CommercialLeadsPage />;
}
