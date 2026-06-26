import type { DemandDraft } from "@/shared/types/lead";
import { validateDemandCompleteness } from "@/features/demand/services/validateDemandCompleteness";

export function detectMissingInfo(demand: DemandDraft) {
  return validateDemandCompleteness(demand).missingFields;
}
