import { n8nClient } from "./n8nClient";

export function triggerSendQuote(payload: unknown) {
 return n8nClient("send-quote", payload);
}
