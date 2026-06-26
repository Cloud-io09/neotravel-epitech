import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { AuditLog } from "@/shared/types/audit-log";

type AuditLogRow = {
  id: string;
  entity_type: AuditLog["entityType"];
  entity_id: string;
  action: string;
  actor_type: AuditLog["actor"];
  input_hash: string | null;
  output_hash: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    actor: row.actor_type,
    inputHash: row.input_hash ?? undefined,
    outputHash: row.output_hash ?? undefined,
    payload: row.payload ?? undefined,
    createdAt: row.created_at
  };
}

export async function createAuditLogRecord(input: Omit<AuditLog, "id" | "createdAt">) {
  if (shouldUseDemoData()) return demoStore.createAuditLog(input);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      actor_type: input.actor,
      input_hash: input.inputHash ?? null,
      output_hash: input.outputHash ?? null,
      payload: input.payload ?? {}
    })
    .select("id, entity_type, entity_id, action, actor_type, input_hash, output_hash, payload, created_at")
    .single();

  if (error) throw error;
  return toAuditLog(data as AuditLogRow);
}

export async function listAuditLogs() {
  if (shouldUseDemoData()) return demoStore.listAuditLogs();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, entity_type, entity_id, action, actor_type, input_hash, output_hash, payload, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as AuditLogRow[]).map(toAuditLog);
}
