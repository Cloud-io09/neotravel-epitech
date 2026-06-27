import { triggerSendQuote } from "@/shared/lib/n8n/triggerSendQuote";

export async function sendQuote(input: unknown) {
 return triggerSendQuote(input);
}
