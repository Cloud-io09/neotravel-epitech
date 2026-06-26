import { isPromptInjection } from "@/shared/lib/ai/guardrails";

export function detectPromptInjection(message: string) {
  return isPromptInjection(message);
}
