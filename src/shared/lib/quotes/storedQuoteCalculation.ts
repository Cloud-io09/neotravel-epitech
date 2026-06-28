import type { QuoteBreakdown } from "@/lib/domain/types";
import type { QuoteCalculation } from "@/shared/types/quote";

type StoredBreakdown = Partial<QuoteBreakdown> & { vehicle_code?: string };

export type StoredQuoteCalculationInput = {
  quoteNumber: string | null;
  priceHt: number | null;
  vatRate: number | null;
  vatAmount: number | null;
  priceTtc: number | null;
  breakdown: StoredBreakdown | null;
  deterministicHash: string | null;
  matrixVersion: string | null;
  currency?: string | null;
};

function money(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function text(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function storedQuoteCalculation(input: StoredQuoteCalculationInput): QuoteCalculation {
  const breakdown = input.breakdown ?? {};
  const distance = breakdown.distance;
  const trip = breakdown.trip;
  const coefficients = breakdown.coefficients;
  const options = breakdown.options;
  const margin = breakdown.margin;
  const totals = breakdown.totals;
  const vat = breakdown.vat;

  // Prefer the engine's explicit option items; fall back to the legacy toll-package shape
  // for quotes generated before option lines existed.
  const optionLines = (options?.items?.length
    ? options.items.map((item) => ({
        code: item.code,
        label: item.label,
        amountEur: money(item.amountEur),
        note: item.note,
        pricingStatus: item.pricingStatus,
      }))
    : options?.tollPackageEur
      ? [{ code: "tolls", label: "Péages", amountEur: money(options.tollPackageEur), pricingStatus: "PRICED" as const, note: "Forfait péages contrôlé" }]
      : []);

  const priceTtc = money(input.priceTtc ?? totals?.priceTtcEur);
  const priceHt = money(input.priceHt ?? totals?.priceHtEur);
  const vatRate = money(input.vatRate ?? vat?.rate ?? 0.1);
  const vatAmount = money(input.vatAmount ?? vat?.amountEur ?? priceTtc - priceHt);
  const optionsTotal = money(options?.totalEur);
  const subtotal = money(totals?.beforeMarginEur ?? priceHt - money(margin?.amountEur));
  const baseAfterCoefficients = money(subtotal - optionsTotal);
  const distanceKm = money(distance?.distanceKm);
  const vehicleCode = text(breakdown.vehicle_code, "À confirmer");
  const pricingMode = distance?.pricingMode === "forfait_grid" ? "forfait_grid" : "long_distance_formula";

  return {
    baseAmount: money(trip?.baseAfterTripTypeEur ?? distance?.oneWayBaseEur),
    passengerAmount: 0,
    optionsAmount: optionsTotal,
    subtotal,
    vatAmount,
    totalAmount: priceTtc,
    currency: input.currency === "EUR" ? "EUR" : "EUR",
    quoteNumber: text(input.quoteNumber, "Devis sans référence"),
    priceHt,
    vatRate,
    priceTtc,
    deterministicHash: text(input.deterministicHash, "legacy-quote"),
    basePriceSource: "route_pricing",
    distanceKm,
    breakdown: {
      routeLabel: "Trajet calculé",
      matrixVersion: text(input.matrixVersion, "legacy"),
      distanceKm,
      basePriceSource: "route_pricing",
      vehicleCode,
      vehicleLabel: vehicleCode,
      transferPricingMode: pricingMode === "forfait_grid" ? "flat_rate_under_180km" : "long_distance_over_180km",
      tariffKm: distance?.gridCeilingKm,
      formulaLabel: pricingMode,
      basePriceEur: money(distance?.oneWayBaseEur),
      options: optionLines,
      optionsTotal,
      subtotal,
      seasonCoeff: money(coefficients?.seasonality),
      urgencyCoeff: money(coefficients?.leadTime),
      capacityCoeff: money(coefficients?.capacity),
      coeffMultiplier: money(coefficients?.total || 1),
      afterCoeff: baseAfterCoefficients,
      margin: money(margin?.amountEur),
      vatAmount,
    },
    coefficients: {
      season: money(coefficients?.seasonality),
      urgency: money(coefficients?.leadTime),
      capacity: money(coefficients?.capacity),
      multiplier: money(coefficients?.total || 1),
    },
    lines: [
      { label: "Transport", amount: baseAfterCoefficients },
      ...(optionsTotal ? [{ label: "Options", amount: optionsTotal }] : []),
    ],
  };
}
