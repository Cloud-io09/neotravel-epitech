import { createAuditLogRecord } from "@/shared/lib/data/auditRepository";
import type { AuditLog } from "@/shared/types/audit-log";
import { hashPayload, sanitizePayload } from "./hashPayload";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateAuditLogInput = Omit<AuditLog, "id" | "createdAt" | "inputHash" | "outputHash" | "payload"> & {
 input?: unknown;
 output?: unknown;
 inputHash?: string;
 outputHash?: string;
 payload?: Record<string, unknown>;
};

function normalizeEntityId(entityId: string) {
 return UUID_PATTERN.test(entityId) ? entityId : NIL_UUID;
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
 return createAuditLogRecord({
  entityType: input.entityType,
  entityId: normalizeEntityId(input.entityId),
  action: input.action,
  actor: input.actor,
  inputHash: input.inputHash ?? (input.input === undefined ? undefined : hashPayload(input.input)),
  outputHash: input.outputHash ?? (input.output === undefined ? undefined : hashPayload(input.output)),
  payload: sanitizePayload({
   ...(input.payload ?? {}),
   originalEntityId: UUID_PATTERN.test(input.entityId) ? undefined : input.entityId
  })
 });
}
