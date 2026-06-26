import type { DemandDraft } from "@/shared/types/lead";
import { detectMissingInfo } from "@/features/demand/ai/detectMissingInfo";

export function runMissingInfoDetection(demand: DemandDraft) {
  return detectMissingInfo(demand);
}
