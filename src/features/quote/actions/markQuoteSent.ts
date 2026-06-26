import { auditActions, createAuditLog } from "@/shared/lib/audit";

export async function markQuoteSent(quoteId: string) {
  const result = {
    quoteId,
    status: "QUOTE_SENT"
  };
  await createAuditLog({
    entityType: "quote",
    entityId: quoteId,
    action: auditActions.quoteSent,
    actor: "system",
    input: { quoteId },
    output: result,
    payload: { status: result.status }
  });
  return result;
}
