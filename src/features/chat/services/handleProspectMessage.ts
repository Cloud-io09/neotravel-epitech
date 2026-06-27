import { runDemandExtraction } from "@/features/ai-orchestration/services/runDemandExtraction";
import { validateDemandCompleteness } from "@/features/demand/services/validateDemandCompleteness";
import { buildChatResponse } from "./buildChatResponse";

export async function handleProspectMessage(input: { message: string }) {
 const extracted = await runDemandExtraction(input.message);
 const validation = validateDemandCompleteness(extracted);

 return buildChatResponse({ extracted, validation });
}
