import { buildClarifyingQuestions } from "./runClarificationQuestions";
import { logModelRun } from "@/shared/lib/audit";

export async function runClarification(input: { missingFields: string[] }) {
  const output = {
    questions: buildClarifyingQuestions(input.missingFields)
  };
  await logModelRun({
    purpose: "clarify",
    provider: "mock",
    model: "mock-clarifier",
    input,
    output,
    status: "mock",
    latencyMs: 0,
    costEur: 0
  });
  return output;
}
