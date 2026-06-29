import type { DemandDraft } from "@/shared/types/lead";
import type { HumanReviewReason } from "@/features/human-review/services/shouldEscalate";

export type HumanReviewSummaryInput = Partial<DemandDraft> & {
 reasons?: HumanReviewReason[];
 confidence?: number | null;
};

function valueOrUnknown(value: unknown) {
 if (value === null || value === undefined || value === "") return "non renseigne";
 if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "aucune";
 return String(value);
}

export function summarizeForHuman(input: HumanReviewSummaryInput) {
 const reasons = input.reasons?.length ? input.reasons.join(", ") : "raison non precisee";

 return [
  `Raisons de reprise: ${reasons}.`,
  `Prospect: ${valueOrUnknown(input.organization)}.`,
  `Email: ${valueOrUnknown(input.email)}.`,
  `Trajet: ${valueOrUnknown(input.departureCity)} -> ${valueOrUnknown(input.arrivalCity)}.`,
  `Date depart: ${valueOrUnknown(input.departureDate)}.`,
  `Date retour: ${valueOrUnknown(input.returnDate)}.`,
  `Passagers: ${valueOrUnknown(input.passengerCount)}.`,
  `Type trajet: ${valueOrUnknown(input.tripType)}.`,
  `Options: ${valueOrUnknown(input.options)}.`,
  `Confiance IA: ${valueOrUnknown(input.confidence)}.`,
  "Action attendue: verification commerciale avant devis, remise, disponibilite partenaire ou engagement client."
 ].join(" ");
}
