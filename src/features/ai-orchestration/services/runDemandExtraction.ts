import type { DemandDraft } from "@/shared/types/lead";
import { logModelRun } from "@/shared/lib/audit";
import { extractDemandInfo } from "@/features/demand/ai/extractDemandInfo";

export async function runDemandExtraction(message: string): Promise<DemandDraft> {
  const output = await extractDemandInfo(message);
  await logModelRun({
    purpose: "extract_demand",
    provider: "mock",
    model: "mock-extractor",
    input: { message },
    output,
    status: "mock",
    latencyMs: 0,
    costEur: 0
  });
  return output;
}
