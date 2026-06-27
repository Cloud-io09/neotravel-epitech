import type { ReactNode } from "react";
import { requireAdminRole } from "@/shared/lib/auth/requireAdmin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
 await requireAdminRole();

 return <main>{children}</main>;
}
