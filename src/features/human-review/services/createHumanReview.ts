import { summarizeForHuman } from "@/features/human-review/ai/summarizeForHuman";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import type { DemandDraft } from "@/shared/types/lead";
import { evaluateHumanReview, type HumanReviewReason } from "./shouldEscalate";

type HumanReviewInput = Partial<DemandDraft> & {
  id?: string;
  leadId?: string;
  reason?: string;
  reasons?: HumanReviewReason[];
  confidence?: number | null;
  controlledDistanceKm?: number | null;
  pricingMatricesActive?: boolean | null;
};

function normalizeHumanReviewInput(input: unknown): HumanReviewInput {
  return input && typeof input === "object" ? (input as HumanReviewInput) : {};
}

export async function createHumanReview(rawInput: unknown) {
  const input = normalizeHumanReviewInput(rawInput);
  const evaluation = evaluateHumanReview({
    rawMessage: input.rawMessage,
    organization: input.organization ?? null,
    email: input.email ?? null,
    departureCity: input.departureCity ?? null,
    arrivalCity: input.arrivalCity ?? null,
    departureDate: input.departureDate ?? null,
    returnDate: input.returnDate ?? null,
    passengerCount: input.passengerCount ?? null,
    tripType: input.tripType ?? null,
    options: input.options ?? [],
    confidence: input.confidence,
    controlledDistanceKm: input.controlledDistanceKm,
    pricingMatricesActive: input.pricingMatricesActive
  });
  const reasons = input.reasons?.length ? input.reasons : evaluation.reasons;
  const summary = summarizeForHuman({ ...input, reasons });
  const entityId = input.leadId ?? input.id ?? "human-review-draft";

  await createAuditLog({
    entityType: "human_review",
    entityId,
    action: auditActions.humanReviewCreated,
    actor: "system",
    input,
    output: { status: "HUMAN_REVIEW", reasons, summary },
    payload: {
      status: "HUMAN_REVIEW",
      reason: input.reason ?? reasons[0] ?? "MANUAL_HUMAN_REVIEW",
      reasons,
      summary
    }
  });

  return {
    status: "HUMAN_REVIEW",
    reasons,
    summary
  };
}
