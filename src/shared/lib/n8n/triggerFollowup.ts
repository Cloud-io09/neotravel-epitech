import { n8nClient } from "./n8nClient";

export function triggerFollowup(payload: unknown) {
 return n8nClient("followup", payload);
}
