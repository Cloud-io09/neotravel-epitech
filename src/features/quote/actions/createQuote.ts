import { generateQuote } from "../services/generateQuote";
import { calculateQuote } from "../services/calculateQuote";

export async function createQuote(input: Parameters<typeof calculateQuote>[0]) {
 const calculation = calculateQuote(input);
 return generateQuote({ demand: input, calculation });
}
