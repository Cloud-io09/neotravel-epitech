import { createModelRunRecord } from "@/shared/lib/data/modelRunRepository";
import type { ModelRun } from "@/shared/types/model-run";
import { auditActions } from "./auditActions";
import { createAuditLog } from "./createAuditLog";
import { hashPayload } from "./hashPayload";

export type LogModelRunInput = Omit<ModelRun, "id" | "createdAt" | "payloadHash"> & {
 input?: unknown;
 output?: unknown;
};

export async function logModelRun(input: LogModelRunInput): Promise<ModelRun> {
 const inputHash = hashPayload(input.input ?? { purpose: input.purpose, model: input.model });
 const outputHash = input.outputHash ?? (input.output === undefined ? undefined : hashPayload(input.output));

 const modelRun = await createModelRunRecord({
  leadId: input.leadId,
  purpose: input.purpose,
  provider: input.provider ?? "mock",
  model: input.model,
  promptTokens: input.promptTokens,
  completionTokens: input.completionTokens,
  costEur: input.costEur,
  latencyMs: input.latencyMs,
  payloadHash: inputHash,
  outputHash,
  status: input.status ?? "success",
  errorMessage: input.errorMessage
 });

 await createAuditLog({
  entityType: "model_run",
  entityId: modelRun.id,
  action: auditActions.modelRunCreated,
  actor: "ai",
  inputHash,
  outputHash,
  payload: {
   purpose: modelRun.purpose,
   provider: modelRun.provider,
   model: modelRun.model,
   status: modelRun.status,
   estimatedCostEur: modelRun.costEur,
   latencyMs: modelRun.latencyMs
  }
 });

 return modelRun;
}
