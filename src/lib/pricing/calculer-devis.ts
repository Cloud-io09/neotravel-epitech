import { createHash } from "node:crypto";

import type {
  CapacityPricingRule,
  HumanReviewCode,
  LeadTimePricingRule,
  PricingRules,
  QuoteBreakdown,
  QuoteInput,
  QuoteOptionLine,
  QuoteOptions,
  QuoteOutput,
  QuoteResult,
} from "../domain/types";
import { DEFAULT_PRICING_RULES } from "./pricing-rules";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function calculer_devis(
  input: QuoteInput,
  rules: PricingRules = DEFAULT_PRICING_RULES,
): QuoteResult {
  const passengerReview = validatePassengerCount(input.passengerCount);

  if (passengerReview) {
    return passengerReview;
  }

  if (!Number.isFinite(input.distanceKm) || input.distanceKm === undefined || input.distanceKm <= 0) {
    return humanReview(
      "UNKNOWN_ROUTE_NO_DISTANCE",
      "Distance absente ou invalide : le devis doit passer en revue humaine.",
    );
  }

  const requestDate = parseIsoCalendarDate(input.requestDate);
  const departureDate = parseIsoCalendarDate(input.departureDate);

  if (!requestDate || !departureDate) {
    return humanReview("INVALID_DATE", "Date de demande ou de départ invalide.");
  }

  const daysBeforeDeparture = daysBetween(requestDate, departureDate);

  if (daysBeforeDeparture < 0) {
    return humanReview("DEPARTURE_IN_PAST", "La date de départ est antérieure à la date de demande.");
  }

  const distance = calculateDistanceBase(input.distanceKm, rules);
  const tripMultiplier = input.tripType === "round_trip" ? 2 : 1;
  const baseAfterTripTypeEur = roundCurrency(distance.oneWayBaseEur * tripMultiplier);
  const seasonalityCoefficient = findSeasonalityCoefficient(departureDate.month, rules);
  const leadTimeRule = findLeadTimeRule(daysBeforeDeparture, rules);
  const capacityRule = findCapacityRule(input.passengerCount, rules);
  const totalCoefficient =
    1 + seasonalityCoefficient + leadTimeRule.coefficient + capacityRule.coefficient;
  const coefficientAmountEur = roundCurrency(baseAfterTripTypeEur * (totalCoefficient - 1));
  const baseAfterCoefficientsEur = roundCurrency(baseAfterTripTypeEur * totalCoefficient);
  const tollPackageEur = normalizeControlledAmount(input.options?.tollPackageEur);
  const optionItems = buildOptionLines(input.options, tollPackageEur);
  // Only options with an official/controlled amount add to the total. Placeholder lines
  // (guide, nuit chauffeur, péages non chiffrés) carry amountEur 0 and never inflate it.
  const optionsTotalEur = roundCurrency(
    optionItems.reduce((sum, item) => sum + (item.pricingStatus === "PRICED" ? item.amountEur : 0), 0),
  );
  const beforeMarginEur = roundCurrency(baseAfterCoefficientsEur + optionsTotalEur);
  const marginAmountEur = roundCurrency(beforeMarginEur * rules.marginRate);
  const priceHt = roundCurrency(beforeMarginEur + marginAmountEur);
  const vatAmount = roundCurrency(priceHt * rules.vatRate);
  const priceTtc = roundCurrency(priceHt + vatAmount);

  const breakdown: QuoteBreakdown = {
    distance: {
      distanceKm: input.distanceKm,
      source: input.distanceSource,
      pricingMode: distance.pricingMode,
      gridCeilingKm: distance.gridCeilingKm,
      oneWayBaseEur: distance.oneWayBaseEur,
    },
    trip: {
      type: input.tripType,
      multiplier: tripMultiplier,
      baseAfterTripTypeEur,
    },
    coefficients: {
      seasonality: seasonalityCoefficient,
      leadTime: leadTimeRule.coefficient,
      capacity: capacityRule.coefficient,
      total: totalCoefficient,
      amountEur: coefficientAmountEur,
    },
    options: {
      items: optionItems,
      tollPackageEur,
      totalEur: optionsTotalEur,
    },
    margin: {
      rate: rules.marginRate,
      amountEur: marginAmountEur,
    },
    vat: {
      rate: rules.vatRate,
      amountEur: vatAmount,
    },
    totals: {
      beforeMarginEur,
      priceHtEur: priceHt,
      priceTtcEur: priceTtc,
    },
  };

  const hashPayload = {
    input: normalizeInput(input),
    rulesVersion: rules.version,
    breakdown,
    priceHt,
    vatAmount,
    priceTtc,
  };
  const deterministicHash = sha256(stableStringify(hashPayload));

  const quote: QuoteOutput = {
    quote_number: `NT-${deterministicHash.slice(0, 10).toUpperCase()}`,
    vehicle_code: capacityRule.vehicleCode,
    price_ht: priceHt,
    vat_rate: rules.vatRate,
    vat_amount: vatAmount,
    price_ttc: priceTtc,
    breakdown,
    deterministic_hash: deterministicHash,
    matrices_version: rules.version,
  };

  return { ok: true, quote };
}

/**
 * Builds the option breakdown lines. The engine is the ONLY place option lines are created.
 * An option only carries a real amount when an official/controlled value exists (toll
 * package). Otherwise the line is a 0 € placeholder explicitly marked TO_CONFIRM/INCLUDED —
 * never presented as free, and never added to the total.
 */
function buildOptionLines(options: QuoteOptions | undefined, tollPackageEur: number): QuoteOptionLine[] {
  const items: QuoteOptionLine[] = [];

  const guideRequested = Boolean(options?.guide) || (options?.guideDays ?? 0) > 0;
  const driverRequested = Boolean(options?.driverOvernight) || (options?.driverNights ?? 0) > 0;
  const tollsRequested = Boolean(options?.tolls) || Boolean(options?.tollsIncluded) || tollPackageEur > 0;

  if (guideRequested) {
    items.push({
      code: "guide",
      label: "Guide / accompagnateur",
      amountEur: 0,
      pricingStatus: "TO_CONFIRM",
      note: "À chiffrer commercialement",
    });
  }

  if (driverRequested) {
    items.push({
      code: "driver_overnight",
      label: "Nuit chauffeur",
      amountEur: 0,
      pricingStatus: "TO_CONFIRM",
      note: "À confirmer selon organisation",
    });
  }

  if (tollsRequested) {
    items.push(
      tollPackageEur > 0
        ? {
            code: "tolls",
            label: "Péages",
            amountEur: tollPackageEur,
            pricingStatus: "PRICED",
            note: "Forfait péages contrôlé",
          }
        : {
            code: "tolls",
            label: "Péages",
            amountEur: 0,
            pricingStatus: "INCLUDED",
            note: "Inclus ou à confirmer selon trajet",
          },
    );
  }

  return items;
}

function validatePassengerCount(passengerCount: number): QuoteResult | null {
  if (!Number.isFinite(passengerCount) || passengerCount <= 0) {
    return humanReview(
      "PAX_ZERO_OR_NEGATIVE",
      "Nombre de passagers nul, négatif ou invalide.",
    );
  }

  if (passengerCount > 85) {
    return humanReview(
      "PAX_OVER_85",
      "Nombre de passagers supérieur à 85 : revue humaine requise.",
    );
  }

  return null;
}

function humanReview(review: HumanReviewCode, message: string): QuoteResult {
  return { ok: false, review, message };
}

function calculateDistanceBase(distanceKm: number, rules: PricingRules) {
  if (distanceKm <= 180) {
    const gridCeilingKm = Math.ceil(distanceKm / 10) * 10;
    const gridRule = rules.forfaitDistanceGrid.find(
      (rule) => rule.distanceKm === gridCeilingKm,
    );

    if (!gridRule) {
      throw new Error(`Missing pricing grid rule for ${gridCeilingKm} km.`);
    }

    return {
      pricingMode: "forfait_grid" as const,
      gridCeilingKm,
      oneWayBaseEur: gridRule.priceEur,
    };
  }

  return {
    pricingMode: "long_distance_formula" as const,
    oneWayBaseEur: roundCurrency(distanceKm * 2 * rules.longDistanceRatePerKmPerLeg),
  };
}

function findSeasonalityCoefficient(month: number, rules: PricingRules): number {
  const season = Object.values(rules.seasonality).find((rule) => rule.months.includes(month));

  return season?.coefficient ?? 0;
}

function findLeadTimeRule(daysBeforeDeparture: number, rules: PricingRules): LeadTimePricingRule {
  const leadTimeRule = rules.leadTime.find((rule) => {
    const aboveMinimum =
      rule.minDaysExclusive === undefined || daysBeforeDeparture > rule.minDaysExclusive;
    const belowMaximum =
      rule.maxDaysInclusive === undefined || daysBeforeDeparture <= rule.maxDaysInclusive;

    return aboveMinimum && belowMaximum;
  });

  if (!leadTimeRule) {
    throw new Error(`Missing lead-time pricing rule for ${daysBeforeDeparture} days.`);
  }

  return leadTimeRule;
}

function findCapacityRule(passengerCount: number, rules: PricingRules): CapacityPricingRule {
  const capacityRule = rules.capacity.find((rule) => {
    const aboveMinimum =
      rule.minPassengersExclusive === undefined || passengerCount > rule.minPassengersExclusive;

    return aboveMinimum && passengerCount <= rule.maxPassengersInclusive;
  });

  if (!capacityRule) {
    throw new Error(`Missing capacity pricing rule for ${passengerCount} passengers.`);
  }

  return capacityRule;
}

function normalizeControlledAmount(amount: number | undefined): number {
  if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return roundCurrency(amount);
}

function parseIsoCalendarDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, time: date.getTime() };
}

function daysBetween(
  startDate: NonNullable<ReturnType<typeof parseIsoCalendarDate>>,
  endDate: NonNullable<ReturnType<typeof parseIsoCalendarDate>>,
): number {
  return Math.round((endDate.time - startDate.time) / MS_PER_DAY);
}

function normalizeInput(input: QuoteInput) {
  return {
    leadId: input.leadId,
    departureCity: input.departureCity,
    arrivalCity: input.arrivalCity,
    departureDate: input.departureDate,
    requestDate: input.requestDate,
    tripType: input.tripType,
    passengerCount: input.passengerCount,
    distanceKm: input.distanceKm,
    distanceSource: input.distanceSource,
    options: {
      guideDays: input.options?.guideDays,
      driverNights: input.options?.driverNights,
      tollsIncluded: input.options?.tollsIncluded,
      tollPackageEur: input.options?.tollPackageEur,
    },
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

  return `{${entries.join(",")}}`;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
