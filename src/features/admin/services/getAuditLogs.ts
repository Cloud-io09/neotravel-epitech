import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/shared/types/audit-log";

type AuditFilters = {
  entityType?: string;
  action?: string;
  actor?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function getAuditLogs(filters: AuditFilters = {}): Promise<AuditLog[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, entity_type, entity_id, action, metadata, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Unable to load audit logs: ${error.message}`);

  return (data ?? [])
    .map((log) => ({
      id: log.id,
      entityType: log.entity_type as AuditLog["entityType"],
      entityId: log.entity_id,
      action: log.action,
      actor: "system" as const,
      payload: (log.metadata ?? {}) as Record<string, unknown>,
      createdAt: log.created_at,
    }))
    .filter((log) => {
      if (filters.entityType && log.entityType !== filters.entityType) return false;
      if (filters.actor && log.actor !== filters.actor) return false;
      if (filters.action && !log.action.toLowerCase().includes(filters.action.toLowerCase())) return false;
      if (filters.dateFrom && log.createdAt < `${filters.dateFrom}T00:00:00.000Z`) return false;
      if (filters.dateTo && log.createdAt > `${filters.dateTo}T23:59:59.999Z`) return false;
      return true;
    });
}
