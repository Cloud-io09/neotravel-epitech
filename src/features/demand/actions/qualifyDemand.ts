import type { DemandDraft } from "@/shared/types/lead";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { updateLeadRecord } from "@/shared/lib/data/leadRepository";
import { buildClarifyingQuestions } from "@/features/demand/ai/buildClarifyingQuestions";
import { summarizeDemand } from "@/features/demand/ai/summarizeDemand";
import { createHumanReview } from "@/features/human-review/services/createHumanReview";
import { evaluateHumanReview } from "@/features/human-review/services/shouldEscalate";
import { validateDemandCompleteness } from "../services/validateDemandCompleteness";

function estimateConfidence(missingFields: string[]) {
 const requiredCount = 7;
 const presentCount = Math.max(0, requiredCount - missingFields.length);
 if (missingFields.length === 0) return 0.95;
 return Math.max(0.35, Math.round((presentCount / requiredCount) * 100) / 100);
}

export async function qualifyDemand(demand: DemandDraft & { id?: string }) {
 const result = validateDemandCompleteness(demand);
 const missingFields = result.missingFields.map(String);
 const questions = buildClarifyingQuestions(missingFields);
 const summary = summarizeDemand(demand);
 const confidence = estimateConfidence(missingFields);
 const humanReview = result.complete ? evaluateHumanReview(demand) : { escalate: false, reasons: [] };
 const status = !result.complete ? "INCOMPLETE" : humanReview.escalate ? "HUMAN_REVIEW" : "QUALIFIED";
 const humanReviewReason = humanReview.reasons[0] ?? null;

 if (demand.id) {
  await updateLeadRecord(demand.id, {
   status,
   missingFields,
   humanReviewReason,
   aiSummary: summary,
   confidence
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
  output: { ...result, status, questions, summary, confidence, humanReviewReasons: humanReview.reasons },
  payload: {
   status,
   complete: result.complete,
   confidence,
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
  confidence,
  humanReviewReasons: humanReview.reasons,
  humanReviewReason
 };
}
