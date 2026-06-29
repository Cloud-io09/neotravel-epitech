import { logModelRun } from "@/shared/lib/audit";
import { summarizeDemand } from "@/features/demand/ai/summarizeDemand";

export async function runHumanReviewSummary(input: unknown) {
  const summary =
    input && typeof input === "object" && "options" in input
      ? summarizeDemand(input as Parameters<typeof summarizeDemand>[0])
      : "Demande à reprendre par un commercial.";
  const output = {
    summary,
    input
  };
  await logModelRun({
    purpose: "summarize",
    provider: "mock",
    model: "mock-human-review-summary",
    input,
    output,
    status: "mock",
    latencyMs: 0,
    costEur: 0
  });
  return output;
}
