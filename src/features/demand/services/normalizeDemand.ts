import type { DemandDraft } from "@/shared/types/lead";

export function normalizeDemand(demand: DemandDraft): DemandDraft {
 return {
  ...demand,
  departureCity: demand.departureCity?.trim() ?? null,
  arrivalCity: demand.arrivalCity?.trim() ?? null
 };
}
