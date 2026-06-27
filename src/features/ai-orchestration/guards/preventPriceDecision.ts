export function preventPriceDecision(output: string) {
 if (/\b(prix|montant|eur|€)\b/i.test(output)) {
  throw new Error("L'IA ne doit pas produire de prix.");
 }
}
