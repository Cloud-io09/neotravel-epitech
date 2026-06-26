import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { QuoteBreakdown } from "@/lib/domain/types";
import type { Quote, QuoteCalculation } from "@/shared/types/quote";

type StoredBreakdown = QuoteBreakdown & { vehicle_code?: string };

export async function getQuoteById(quoteId: string): Promise<Quote | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, lead_id, quote_number, price_ht, vat_rate, tva_10pct, price_ttc, breakdown, deterministic_hash, matrices_version, status",
    )
    .eq("id", quoteId)
    .maybeSingle();

  if (error) throw new Error(`Unable to load quote: ${error.message}`);
  if (!data || !data.lead_id) return null;

  const breakdown = data.breakdown as StoredBreakdown;

  return {
    id: data.id,
    leadId: data.lead_id,
    status: data.status as Quote["status"],
    calculation: toQuoteCalculation({
      quoteNumber: data.quote_number,
      priceHt: Number(data.price_ht),
      vatRate: Number(data.vat_rate),
      vatAmount: Number(data.tva_10pct),
      priceTtc: Number(data.price_ttc),
      breakdown,
      deterministicHash: data.deterministic_hash,
      matrixVersion: data.matrices_version,
    }),
  };
}

function toQuoteCalculation(input: {
  quoteNumber: string;
  priceHt: number;
  vatRate: number;
  vatAmount: number;
  priceTtc: number;
  breakdown: StoredBreakdown;
  deterministicHash: string;
  matrixVersion: string;
}): QuoteCalculation {
  const { breakdown } = input;
  const vehicleCode = breakdown.vehicle_code ?? "À confirmer";
  const baseAfterCoefficients = breakdown.totals.beforeMarginEur - breakdown.options.totalEur;

  return {
    baseAmount: breakdown.trip.baseAfterTripTypeEur,
    passengerAmount: 0,
    optionsAmount: breakdown.options.totalEur,
    subtotal: breakdown.totals.beforeMarginEur,
    vatAmount: input.vatAmount,
    totalAmount: input.priceTtc,
    currency: "EUR",
    quoteNumber: input.quoteNumber,
    priceHt: input.priceHt,
    vatRate: input.vatRate,
    priceTtc: input.priceTtc,
    deterministicHash: input.deterministicHash,
    basePriceSource: "route_pricing",
    distanceKm: breakdown.distance.distanceKm,
    breakdown: {
      routeLabel: "Trajet calculé",
      matrixVersion: input.matrixVersion,
      distanceKm: breakdown.distance.distanceKm,
      basePriceSource: "route_pricing",
      vehicleCode,
      vehicleLabel: vehicleCode,
      transferPricingMode:
        breakdown.distance.pricingMode === "forfait_grid"
          ? "flat_rate_under_180km"
          : "long_distance_over_180km",
      tariffKm: breakdown.distance.gridCeilingKm,
      formulaLabel: breakdown.distance.pricingMode,
      basePriceEur: breakdown.distance.oneWayBaseEur,
      options: breakdown.options.tollPackageEur
        ? [{ code: "toll_package", label: "Forfait péages", amountEur: breakdown.options.tollPackageEur }]
        : [],
      optionsTotal: breakdown.options.totalEur,
      subtotal: breakdown.totals.beforeMarginEur,
      seasonCoeff: breakdown.coefficients.seasonality,
      urgencyCoeff: breakdown.coefficients.leadTime,
      capacityCoeff: breakdown.coefficients.capacity,
      coeffMultiplier: breakdown.coefficients.total,
      afterCoeff: baseAfterCoefficients,
      margin: breakdown.margin.amountEur,
      vatAmount: input.vatAmount,
    },
    coefficients: {
      season: breakdown.coefficients.seasonality,
      urgency: breakdown.coefficients.leadTime,
      capacity: breakdown.coefficients.capacity,
      multiplier: breakdown.coefficients.total,
    },
    lines: [
      { label: "Transport", amount: baseAfterCoefficients },
      ...(breakdown.options.totalEur
        ? [{ label: "Options", amount: breakdown.options.totalEur }]
        : []),
    ],
  };
}
