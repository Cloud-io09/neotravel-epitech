import type { LeadStatus } from "@/shared/types/lead";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <span>{status}</span>;
}
