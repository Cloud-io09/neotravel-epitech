import { listAuditLogs } from "@/shared/lib/data/auditRepository";
import type { AuditLog } from "@/shared/types/audit-log";

type AuditFilters = {
 entityType?: string;
 action?: string;
 actor?: string;
 dateFrom?: string;
 dateTo?: string;
};

function applyFilters(logs: AuditLog[], filters: AuditFilters) {
 const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00.000Z`) : null;
 const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999Z`) : null;

 return logs.filter((log) => {
  const createdAt = new Date(log.createdAt);
  if (filters.entityType && log.entityType !== filters.entityType) return false;
  if (filters.actor && log.actor !== filters.actor) return false;
  if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
  if (dateFrom && createdAt < dateFrom) return false;
  if (dateTo && createdAt > dateTo) return false;
  return true;
 });
}

export async function getAuditLogs(filters: AuditFilters = {}) {
 const logs = await listAuditLogs();
 return applyFilters(logs, filters);
}
