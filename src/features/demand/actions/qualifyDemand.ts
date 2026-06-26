import type { DemandDraft } from "@/shared/types/lead";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { updateLeadRecord } from "@/shared/lib/data/leadRepository";
import { buildClarifyingQuestions } from "@/features/demand/ai/buildClarifyingQuestions";
import { summarizeDemand } from "@/features/demand/ai/summarizeDemand";
import { createHumanReview } from "@/features/human-review/services/createHumanReview";
import { evaluateHumanReview } from "@/features/human-review/services/shouldEscalate";
import { validateDemandCompleteness } from "../services/validateDemandCompleteness";

export async function qualifyDemand(demand: DemandDraft & { id?: string }) {
  const result = validateDemandCompleteness(demand);
  const missingFields = result.missingFields.map(String);
  const questions = buildClarifyingQuestions(missingFields);
  const summary = summarizeDemand(demand);
  const humanReview = result.complete ? evaluateHumanReview(demand) : { escalate: false, reasons: [] };
  const status = !result.complete ? "INCOMPLETE" : humanReview.escalate ? "HUMAN_REVIEW" : "QUALIFIED";
  const humanReviewReason = humanReview.reasons[0] ?? null;

  if (demand.id) {
    await updateLeadRecord(demand.id, {
      status,
      missingFields,
      humanReviewReason,
      aiSummary: summary
    });
  }

  if (humanReview.escalate) {
    await createHumanReview({
      ...demand,
      leadId: demand.id,
      reasons: humanReview.reasons,
      reason: humanReviewReason ?? undefined
    });
  }

  await createAuditLog({
    entityType: "lead",
    entityId: demand.id ?? "qualification-draft",
    action:
      status === "HUMAN_REVIEW"
        ? auditActions.humanReviewCreated
        : result.complete
          ? auditActions.leadQualified
          : auditActions.leadIncomplete,
    actor: "system",
    input: demand,
    output: { ...result, status, questions, summary, humanReviewReasons: humanReview.reasons },
    payload: {
      status,
      complete: result.complete,
      missingFields,
      humanReviewReasons: humanReview.reasons,
      questionAsked: questions[0] ?? null
    }
  });
  return {
    ...result,
    status,
    missingFields,
    questions,
    summary,
    humanReviewReasons: humanReview.reasons,
    humanReviewReason
  };
}
