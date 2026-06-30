import { FollowupsDashboardPage } from "@/features/dashboard/components/DashboardViews";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function FollowupsPage({
 searchParams
}: {
 searchParams: Promise<{ status?: string; sort?: string; order?: string }>;
}) {
 await requirePermission("followups");
 const { status, sort, order } = await searchParams;
 return <FollowupsDashboardPage status={status} sort={sort} order={order} />;
}
