import { runPartnerSuggestion } from "@/features/ai-orchestration/services/runPartnerSuggestion";

export async function suggestPartnerContext(input: unknown) {
 const suggestion = await runPartnerSuggestion(input);

 return {
  ...suggestion,
  context:
   "Contexte indicatif genere pour le commercial. Le statut Confirme par commercial doit provenir d'une action humaine ou d'une donnee deja validee."
 };
}
