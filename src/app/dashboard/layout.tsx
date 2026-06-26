import type { ReactNode } from "react";
import { DashboardSidebar } from "@/features/dashboard/components/DashboardSidebar";
import styles from "@/features/dashboard/components/dashboard.module.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <DashboardSidebar />
      <div>{children}</div>
    </div>
  );
}
