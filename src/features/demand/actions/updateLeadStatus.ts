import type { LeadStatus } from "@/shared/types/lead";
import { auditActions, createAuditLog } from "@/shared/lib/audit";

export async function updateLeadStatus(leadId: string, status: LeadStatus) {
 const result = { leadId, status };
 await createAuditLog({
  entityType: "lead",
  entityId: leadId,
  action:
   status === "INCOMPLETE"
    ? auditActions.leadIncomplete
    : status === "HUMAN_REVIEW"
     ? auditActions.humanReviewCreated
     : auditActions.statusChanged,
  actor: "system",
  input: { leadId, status },
  output: result,
  payload: { status }
 });
 return result;
}
