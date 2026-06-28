import { n8nClient } from "./n8nClient";

export function triggerCustomerEmail(payload: unknown) {
  return n8nClient("customer-email", payload);
}
