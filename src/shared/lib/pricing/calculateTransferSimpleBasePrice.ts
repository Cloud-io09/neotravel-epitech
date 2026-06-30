import {
 TRANSFER_SIMPLE_FLAT_RATE_MAX_KM,
 TRANSFER_SIMPLE_FLAT_RATES,
 TRANSFER_SIMPLE_LONG_DISTANCE_MULTIPLIER,
 TRANSFER_SIMPLE_LONG_DISTANCE_RATE_EUR
} from "./pricing.constants";
import { round2 } from "./round2";

export type TransferSimpleBasePrice = {
 basePriceEur: number;
 pricingMode: "flat_rate_under_180km" | "long_distance_over_180km";
 tariffKm?: number;
 formulaLabel: string;
};

export function calculateTransferSimpleBasePrice(distanceKm: number): TransferSimpleBasePrice {
 if (distanceKm <= 0) throw new Error("DISTANCE_INVALID");

 if (distanceKm <= TRANSFER_SIMPLE_FLAT_RATE_MAX_KM) {
  const tariffKm = Math.max(10, Math.ceil(distanceKm / 10) * 10) as keyof typeof TRANSFER_SIMPLE_FLAT_RATES;
  const basePriceEur = TRANSFER_SIMPLE_FLAT_RATES[tariffKm];
  if (!basePriceEur) throw new Error("TRANSFER_SIMPLE_FLAT_RATE_UNKNOWN");

  return {
   basePriceEur,
   pricingMode: "flat_rate_under_180km",
   tariffKm,
   formulaLabel: `forfait ${tariffKm} km`
  };
 }

 return {
  basePriceEur: round2(
   distanceKm * TRANSFER_SIMPLE_LONG_DISTANCE_MULTIPLIER * TRANSFER_SIMPLE_LONG_DISTANCE_RATE_EUR
  ),
  pricingMode: "long_distance_over_180km",
  formulaLabel: "(km x 2) x 2,5 EUR"
 };
}
