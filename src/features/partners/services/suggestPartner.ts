import { runPartnerSuggestion } from "@/features/ai-orchestration/services/runPartnerSuggestion";

export async function suggestPartner(input: unknown) {
  return runPartnerSuggestion(input);
}
