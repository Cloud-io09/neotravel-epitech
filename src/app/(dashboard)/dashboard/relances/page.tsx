import { FollowupsDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function FollowupsPage() {
 await requirePermission("followups");
 return <FollowupsDashboardPage />;
}
