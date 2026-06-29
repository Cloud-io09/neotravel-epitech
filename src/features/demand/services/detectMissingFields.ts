import { validateDemandCompleteness } from "./validateDemandCompleteness";
import type { DemandDraft } from "@/shared/types/lead";

export function detectMissingFields(demand: DemandDraft) {
 return validateDemandCompleteness(demand).missingFields;
}
