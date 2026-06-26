import type { DemandDraft } from "@/shared/types/lead";

export function summarizeDemand(demand: DemandDraft) {
  const parts = [
    demand.organization ? `Organisation: ${demand.organization}` : null,
    demand.departureCity && demand.arrivalCity ? `Trajet: ${demand.departureCity} -> ${demand.arrivalCity}` : null,
    demand.departureDate ? `Depart: ${demand.departureDate}` : null,
    demand.returnDate ? `Retour: ${demand.returnDate}` : null,
    demand.passengerCount ? `Passagers: ${demand.passengerCount}` : null,
    demand.tripType ? `Type: ${demand.tripType}` : null,
    demand.options.length > 0 ? `Options: ${demand.options.join(", ")}` : null
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" | ") : "Demande insuffisamment detaillee.";
}
