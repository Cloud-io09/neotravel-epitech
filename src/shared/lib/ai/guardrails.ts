import { auditActions, createAuditLog } from "@/shared/lib/audit";

export const aiGuardrails = {
 noPriceDecision: true,
 noPartnerConfirmation: true,
 humanReviewForComplexCases: true
};

export const promptInjectionPattern =
 /ignore (les )?(r[eè]gles|instructions)|ignore previous|system prompt|developer message|bypass|jailbreak|oublie ton prompt|ne passe pas par calculer_devis|calcule (un |le )?prix toi[- ]m[eê]me|donne-moi .*remise|contredis (le )?(kick[- ]off|prompt syst[eè]me|r[eè]gles m[eé]tier)/i;

export function isPromptInjection(input: string) {
 return promptInjectionPattern.test(input);
}

export async function detectPromptInjection(input: string, entityId = "guardrail-draft") {
 const detected = isPromptInjection(input);
 if (detected) {
  await createAuditLog({
   entityType: "human_review",
   entityId,
   action: auditActions.promptInjectionDetected,
   actor: "system",
   input: { message: input },
   output: { detected },
   payload: { detected }
  });
 }
 return detected;
}
