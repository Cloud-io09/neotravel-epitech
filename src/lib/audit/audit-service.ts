import { createServerSupabaseClient } from "../supabase/server";

export type AuditEventInput = {
  entityType: string;
  entityId: string;
  action: string;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("audit_logs").insert({
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("Failed to write audit log", error);
  }
}
