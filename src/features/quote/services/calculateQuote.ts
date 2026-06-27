import { calculerDevis } from "@/shared/lib/pricing/calculerDevis";
import type { QuoteCalculation } from "@/shared/types/quote";

export function calculateQuote(input: {
 departureCity?: string;
 arrivalCity?: string;
 departureDate?: string;
 passengerCount?: number;
 options?: string[];
 controlledDistanceKm?: number;
}): QuoteCalculation {
 const pricing = calculerDevis({
  departureCity: input.departureCity ?? "",
  arrivalCity: input.arrivalCity ?? "",
  departureDate: input.departureDate ?? "",
  passengerCount: input.passengerCount ?? 0,
  controlledDistanceKm: input.controlledDistanceKm,
  options: (input.options ?? []).map((option) => ({
   code: option
  }))
 });

 return {
  baseAmount: pricing.basePriceEur,
  passengerAmount: 0,
  optionsAmount: pricing.breakdown.optionsTotal,
  subtotal: pricing.priceHt,
  vatAmount: pricing.breakdown.vatAmount,
  totalAmount: pricing.priceTtc,
  currency: "EUR",
  quoteNumber: pricing.quoteNumber,
  priceHt: pricing.priceHt,
  vatRate: pricing.vatRate,
  priceTtc: pricing.priceTtc,
  deterministicHash: pricing.deterministicHash,
  basePriceSource: pricing.basePriceSource,
  distanceKm: pricing.breakdown.distanceKm,
  breakdown: pricing.breakdown,
  coefficients: {
   season: pricing.breakdown.seasonCoeff,
   urgency: pricing.breakdown.urgencyCoeff,
   capacity: pricing.breakdown.capacityCoeff,
   multiplier: pricing.breakdown.coeffMultiplier
  },
  lines: [
   { label: "Base distance", amount: pricing.breakdown.basePriceEur },
   { label: "Options", amount: pricing.breakdown.optionsTotal },
   { label: "Marge", amount: pricing.breakdown.margin },
   { label: "TVA", amount: pricing.breakdown.vatAmount }
  ]
 };
}
