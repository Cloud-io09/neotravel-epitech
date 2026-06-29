import type { Lead } from "@/shared/types/lead";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { ensureClientForLead } from "@/shared/lib/data/clientRepository";
import { createLeadRecord } from "@/shared/lib/data/leadRepository";
import { validateDemandCompleteness } from "@/features/demand/services/validateDemandCompleteness";

export async function createLead(input: Partial<Lead>) {
 const validation = validateDemandCompleteness({
  rawMessage: input.rawMessage,
  organization: input.organization ?? null,
  email: input.email ?? null,
  departureCity: input.departureCity ?? null,
  arrivalCity: input.arrivalCity ?? null,
  departureDate: input.departureDate ?? null,
  returnDate: input.returnDate ?? null,
  passengerCount: input.passengerCount ?? null,
  tripType: input.tripType ?? null,
  options: input.options ?? []
 });
 const lead = await createLeadRecord({
  ...input,
  status: "NEW",
  missingFields: input.missingFields ?? validation.missingFields.map(String)
 });

 // Une demande de devis crée/lie automatiquement un compte client (Comptes clients).
 if (input.email) {
  await ensureClientForLead({
   email: input.email,
   organization: input.organization ?? null
  }).catch(() => undefined);
 }

 await createAuditLog({
  entityType: "lead",
  entityId: lead.id,
  action: auditActions.leadCreated,
  actor: "user",
  input,
  output: { id: lead.id, status: lead.status },
  payload: { status: lead.status }
 });
 return lead;
}
