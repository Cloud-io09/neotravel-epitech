import { n8nClient } from "./n8nClient";

export function triggerHumanReview(payload: unknown) {
  return n8nClient("human-review-notify", payload);
}
