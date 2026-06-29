import { GeneralDashboardClient } from "./GeneralDashboardClient";
import { getGeneralDashboardData } from "@/features/dashboard/services/getGeneralDashboardData";

export async function DashboardHome() {
  const data = await getGeneralDashboardData();
  return <GeneralDashboardClient data={data} />;
}
