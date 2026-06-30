import { generateText } from "ai";

import { createModelRunRecord } from "@/shared/lib/data/modelRunRepository";
import { hashPayload } from "@/shared/lib/audit/hashPayload";
import type { ModelRun } from "@/shared/types/model-run";
import { estimateAiCostEur } from "./ai-costs";

type GenerateTextInput = Parameters<typeof generateText>[0];
type GenerateTextOutput = Awaited<ReturnType<typeof generateText>>;

type TrackingMetadata = {
  purpose: ModelRun["purpose"];
  provider: string;
  modelId: string;
  leadId?: string | null;
  inputFingerprint: unknown;
};

export async function trackedGenerateText(
  input: GenerateTextInput,
  metadata: TrackingMetadata,
): Promise<GenerateTextOutput> {
  const startedAt = Date.now();
  const inputHash = hashPayload(metadata.inputFingerprint);

  try {
    const result = await generateText(input);
    const latencyMs = Date.now() - startedAt;

    await persistModelRun({
      metadata,
      inputHash,
      outputHash: hashPayload({ text: result.text }),
      promptTokens: result.usage.inputTokens,
      completionTokens: result.usage.outputTokens,
      costEur: estimateAiCostEur(metadata.modelId, result.usage),
      latencyMs,
      status: "success",
    });

    return result;
  } catch (error) {
    const latencyMs = Date.now() - startedAt;

    await persistModelRun({
      metadata,
      inputHash,
      latencyMs,
      status: "error",
      errorMessage: error instanceof Error ? `${error.name}: ${error.message}` : "Unknown AI error",
    });

    throw error;
  }
}

async function persistModelRun(input: {
  metadata: TrackingMetadata;
  inputHash: string;
  outputHash?: string;
  promptTokens?: number;
  completionTokens?: number;
  costEur?: number;
  latencyMs: number;
  status: ModelRun["status"];
  errorMessage?: string;
}) {
  try {
    await createModelRunRecord({
      leadId: input.metadata.leadId ?? null,
      purpose: input.metadata.purpose,
      provider: input.metadata.provider,
      model: input.metadata.modelId,
      promptTokens: input.promptTokens,
      completionTokens: input.completionTokens,
      costEur: input.costEur,
      latencyMs: input.latencyMs,
      payloadHash: input.inputHash,
      outputHash: input.outputHash,
      status: input.status,
      errorMessage: input.errorMessage,
    });
  } catch (error) {
    console.warn("[neotravel:ai-costs] unable to persist model run", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
