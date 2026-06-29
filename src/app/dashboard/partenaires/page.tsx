import { PartnersDashboardClient } from "@/features/dashboard/components/PartnersDashboardClient";
import { getPartnersDashboardData } from "@/features/dashboard/services/getPartnersDashboardData";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";

export default async function PartnersPage({
  searchParams
}: {
  searchParams: Promise<{ partner?: string }>;
}) {
  await requirePermission("partners");
  const { partner: selectedPartnerId } = await searchParams;
  const data = getPartnersDashboardData();

  return <PartnersDashboardClient data={data} selectedPartnerId={selectedPartnerId} />;
}
