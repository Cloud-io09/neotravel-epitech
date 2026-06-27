import { z } from "zod";
import type { PricingInput, PricingOption, PricingResult } from "@/shared/types/pricing";
import {
 DEFAULT_MARGIN_RATE,
 MAX_AUTOMATIC_PASSENGERS,
 OFFICIAL_OPTION_PRICING,
 PRICING_MATRICES_ACTIVE,
 PRICING_MATRIX_VERSION,
 URGENT_DEPARTURE_HOURS,
 VAT_RATE,
 VEHICLE_LABELS
} from "./pricing.constants";
import { calculateTransferSimpleBasePrice } from "./calculateTransferSimpleBasePrice";
import { getCapacityCoeff } from "./getCapacityCoeff";
import { getSeasonCoeff } from "./getSeasonCoeff";
import { getUrgencyCoeff } from "./getUrgencyCoeff";
import { getVehicleCode } from "./getVehicleCode";
import { hashQuote } from "./hashQuote";
import { resolveBasePrice } from "./resolveBasePrice";
import { round2 } from "./round2";

const pricingInputSchema = z.object({
 departureCity: z.string().trim().min(1),
 arrivalCity: z.string().trim().min(1),
 departureDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
 requestDate: z.string().datetime().optional(),
 passengerCount: z.number().int().positive(),
 controlledDistanceKm: z.number().positive().optional(),
 options: z.array(
  z.object({
   code: z.string().trim().min(1),
   label: z.string().trim().optional(),
   amountEur: z.number().min(0).optional()
  })
 ),
 now: z.date().optional()
});

function normalizeDate(value: string) {
 return value.length === 10 ? `${value}T12:00:00.000Z` : value;
}

function normalizeOptions(options: PricingOption[]) {
 return [...options]
  .map((option) => {
   const code = option.code.trim().toLowerCase();
   const officialOption = OFFICIAL_OPTION_PRICING[code as keyof typeof OFFICIAL_OPTION_PRICING];
   if (!officialOption) throw new Error("PRICING_OPTION_UNKNOWN");

   return {
    code,
    label: officialOption.label,
    amountEur: officialOption.amountEur
   };
  })
  .sort((left, right) => left.code.localeCompare(right.code));
}

function normalizeInput(input: PricingInput) {
 return {
  departureCity: input.departureCity.trim(),
  arrivalCity: input.arrivalCity.trim(),
  departureDate: normalizeDate(input.departureDate),
  requestDate: input.requestDate ? normalizeDate(input.requestDate) : undefined,
  passengerCount: input.passengerCount,
  controlledDistanceKm: input.controlledDistanceKm,
  options: normalizeOptions(input.options)
 };
}

function assertDepartureAllowed(departureDate: string, now: Date) {
 const departure = new Date(departureDate);
 if (Number.isNaN(departure.getTime())) throw new Error("INVALID_DEPARTURE_DATE");

 const diffHours = (departure.getTime() - now.getTime()) / 36e5;
 if (diffHours <= 0) throw new Error("PAST_DEPARTURE_DATE");
 if (diffHours < URGENT_DEPARTURE_HOURS) throw new Error("DEPARTURE_LESS_THAN_48H");
}

export function calculerDevis(input: PricingInput): PricingResult {
 const parsed = pricingInputSchema.safeParse(input);
 if (!parsed.success) throw new Error("PRICING_INPUT_INVALID");
 if (input.passengerCount > MAX_AUTOMATIC_PASSENGERS) throw new Error("PASSENGER_COUNT_REQUIRES_HUMAN_REVIEW");
 if (!PRICING_MATRICES_ACTIVE) throw new Error("PRICING_MATRICES_INACTIVE");

 const now = input.now ?? (input.requestDate ? new Date(input.requestDate) : new Date());
 const normalizedInput = normalizeInput(input);
 assertDepartureAllowed(normalizedInput.departureDate, now);

 const routeResolution = resolveBasePrice(
  normalizedInput.departureCity,
  normalizedInput.arrivalCity,
  normalizedInput.controlledDistanceKm
 );
 if (routeResolution === null) throw new Error("ROUTE_UNKNOWN");

 const vehicleCode = getVehicleCode(normalizedInput.passengerCount);
 if (vehicleCode === "INVALID") throw new Error("PRICING_INPUT_INVALID");

 const vehicle = VEHICLE_LABELS[vehicleCode];
 const transferBasePrice = calculateTransferSimpleBasePrice(routeResolution.distanceKm);
 const basePriceEur = transferBasePrice.basePriceEur;
 const optionsTotal = round2(normalizedInput.options.reduce((sum, option) => sum + option.amountEur, 0));
 const seasonCoeff = getSeasonCoeff(normalizedInput.departureDate);
 const urgencyCoeff = getUrgencyCoeff(normalizedInput.departureDate, now);
 const capacityCoeff = getCapacityCoeff(normalizedInput.passengerCount);
 const coeffMultiplier = round2(1 + seasonCoeff + urgencyCoeff + capacityCoeff);
 const subtotal = round2(basePriceEur + optionsTotal);
 const afterCoeff = round2(subtotal * coeffMultiplier);
 const margin = round2(afterCoeff * DEFAULT_MARGIN_RATE);
 const priceHt = round2(afterCoeff + margin);
 const vatAmount = round2(priceHt * VAT_RATE);
 const priceTtc = round2(priceHt + vatAmount);

 const breakdown = {
  routeLabel: `${normalizedInput.departureCity} -> ${normalizedInput.arrivalCity}`,
  matrixVersion: PRICING_MATRIX_VERSION,
  distanceKm: routeResolution.distanceKm,
  basePriceSource: routeResolution.source,
  vehicleCode,
  vehicleLabel: vehicle.label,
  transferPricingMode: transferBasePrice.pricingMode,
  tariffKm: transferBasePrice.tariffKm,
  formulaLabel: transferBasePrice.formulaLabel,
  basePriceEur,
  options: normalizedInput.options,
  optionsTotal,
  subtotal,
  seasonCoeff,
  urgencyCoeff,
  capacityCoeff,
  coeffMultiplier,
  afterCoeff,
  margin,
  vatAmount
 };

 const deterministicHash = hashQuote({
  input: normalizedInput,
  matrixVersion: PRICING_MATRIX_VERSION,
  breakdown
 });

 return {
  quoteNumber: `NT-${deterministicHash.slice(0, 8).toUpperCase()}`,
  basePriceEur,
  basePriceSource: routeResolution.source,
  vehicleCode,
  priceHt,
  vatRate: VAT_RATE,
  priceTtc,
  breakdown,
  deterministicHash
 };
}
