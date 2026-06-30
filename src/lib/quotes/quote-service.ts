import type { QuoteInput, QuoteOptions, QuoteOutput, TripType } from "../domain/types";
import type { QuoteSummary } from "../ai/chat-response";
import { createHash } from "node:crypto";
import { logAuditEvent } from "../audit/audit-service";
import {
  getLeadById,
  markHumanReview,
  markLeadIncomplete,
  updateLeadStatus,
  type LeadRecord,
} from "../leads/lead-service";
import { calculer_devis } from "../pricing/calculer-devis";
import { lookupActivePricingRules } from "../pricing/lookup-pricing-rules";
import { resolveDistance } from "../pricing/resolve-distance";
import { createServerSupabaseClient } from "../supabase/server";

export type CalculateQuoteForLeadResult =
  | { ok: true; quoteId: string; status: "QUOTE_READY"; quote: QuoteSummary }
  | { ok: false; status: "INCOMPLETE" | "HUMAN_REVIEW"; reason: string };

export type SaveQuoteInput = {
  leadId: string;
  quote: QuoteOutput;
};

type QuoteServiceDependencies = {
  getLeadById: typeof getLeadById;
  markLeadIncomplete: typeof markLeadIncomplete;
  markHumanReview: typeof markHumanReview;
  updateLeadStatus: typeof updateLeadStatus;
  resolveDistance: typeof resolveDistance;
  lookupActivePricingRules: typeof lookupActivePricingRules;
  saveQuote: typeof saveQuote;
  logAuditEvent: typeof logAuditEvent;
  getRequestDate: () => string;
};

const defaultDependencies: QuoteServiceDependencies = {
  getLeadById,
  markLeadIncomplete,
  markHumanReview,
  updateLeadStatus,
  resolveDistance,
  lookupActivePricingRules,
  saveQuote,
  logAuditEvent,
  getRequestDate: () => new Date().toISOString().slice(0, 10),
};

export async function calculateQuoteForLead(
  leadId: string,
  dependencies: Partial<QuoteServiceDependencies> = {},
): Promise<CalculateQuoteForLeadResult> {
  const deps = { ...defaultDependencies, ...dependencies };
  const lead = await deps.getLeadById(leadId);

  if (!lead) {
    throw new Error(`Lead ${leadId} not found.`);
  }

  if (hasIntermediateStops(lead)) {
    return calculateMultiSegmentQuoteForLead(leadId, lead, deps);
  }

  const missingFields = getMissingCriticalFields(lead);

  if (missingFields.length > 0) {
    await deps.markLeadIncomplete(leadId, missingFields);

    return {
      ok: false,
      status: "INCOMPLETE",
      reason: `Missing critical fields: ${missingFields.join(", ")}`,
    };
  }

  const distance = await deps.resolveDistance({
    departureCity: lead.departure_city!,
    arrivalCity: lead.arrival_city!,
  });

  if (!distance.ok) {
    await deps.markHumanReview(leadId, distance.review);

    return {
      ok: false,
      status: "HUMAN_REVIEW",
      reason: distance.review,
    };
  }

  const rules = await deps.lookupActivePricingRules();
  const quoteInput: QuoteInput = {
    leadId,
    departureCity: lead.departure_city!,
    arrivalCity: lead.arrival_city!,
    departureDate: lead.departure_date!,
    requestDate: deps.getRequestDate(),
    tripType: lead.trip_type!,
    passengerCount: lead.passenger_count!,
    distanceKm: distance.distanceKm,
    distanceSource: distance.source,
    options: normalizeQuoteOptions(lead.options),
  };
  const result = calculer_devis(quoteInput, rules);

  if (!result.ok) {
    await deps.markHumanReview(leadId, result.review);

    return {
      ok: false,
      status: "HUMAN_REVIEW",
      reason: result.review,
    };
  }

  const quoteId = await deps.saveQuote({ leadId, quote: result.quote });

  await deps.updateLeadStatus(leadId, "QUOTE_READY", {
    quoteId,
    quoteNumber: result.quote.quote_number,
  });
  await deps.logAuditEvent({
    entityType: "quote",
    entityId: quoteId,
    action: "QUOTE_CREATED",
    metadata: {
      leadId,
      quoteNumber: result.quote.quote_number,
      deterministicHash: result.quote.deterministic_hash,
    },
  });

  return {
    ok: true,
    quoteId,
    status: "QUOTE_READY",
    quote: {
      quoteNumber: result.quote.quote_number,
      vehicleCode: result.quote.vehicle_code,
      distanceKm: result.quote.breakdown.distance.distanceKm,
      priceHt: result.quote.price_ht,
      vatAmount: result.quote.vat_amount,
      priceTtc: result.quote.price_ttc,
      departureCity: quoteInput.departureCity,
      arrivalCity: quoteInput.arrivalCity,
      departureDate: quoteInput.departureDate,
      passengerCount: quoteInput.passengerCount,
    },
  };
}

export async function saveQuote(input: SaveQuoteInput): Promise<string> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      lead_id: input.leadId,
      quote_number: input.quote.quote_number,
      distance_km: input.quote.breakdown.distance.distanceKm,
      distance_source: input.quote.breakdown.distance.source ?? "manual",
      price_ht: input.quote.price_ht,
      vat_rate: input.quote.vat_rate,
      tva_10pct: input.quote.vat_amount,
      price_ttc: input.quote.price_ttc,
      breakdown: { ...input.quote.breakdown, vehicle_code: input.quote.vehicle_code },
      deterministic_hash: input.quote.deterministic_hash,
      matrices_version: input.quote.matrices_version,
      status: "QUOTE_READY",
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: dup } = await supabase
        .from("quotes")
        .select("id")
        .eq("deterministic_hash", input.quote.deterministic_hash)
        .single();
      if (dup?.id) return dup.id as string;
    }
    throw new Error(`Unable to save quote for lead ${input.leadId}: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error(`Unable to save quote for lead ${input.leadId}: missing quote id.`);
  }

  return data.id as string;
}

function getMissingCriticalFields(lead: LeadRecord): string[] {
  const missingFields: string[] = [];

  if (!hasText(lead.departure_city)) {
    missingFields.push("departure_city");
  }

  if (!hasText(lead.arrival_city)) {
    missingFields.push("arrival_city");
  }

  if (!hasText(lead.departure_date)) {
    missingFields.push("departure_date");
  }

  if (!Number.isFinite(lead.passenger_count)) {
    missingFields.push("passenger_count");
  }

  if (!isTripType(lead.trip_type)) {
    missingFields.push("trip_type");
  }

  return missingFields;
}

function hasText(value: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isTripType(value: string | null): value is TripType {
  return value === "one_way" || value === "round_trip";
}

function hasIntermediateStops(lead: LeadRecord): boolean {
  return lead.intermediate_stops.some((stop) => stop.trim().length > 0);
}

async function calculateMultiSegmentQuoteForLead(
  leadId: string,
  lead: LeadRecord,
  deps: QuoteServiceDependencies,
): Promise<CalculateQuoteForLeadResult> {
  const missingFields = getMissingCriticalFields(lead);

  if (missingFields.length > 0) {
    await deps.markLeadIncomplete(leadId, missingFields);

    return {
      ok: false,
      status: "INCOMPLETE",
      reason: `Missing critical fields: ${missingFields.join(", ")}`,
    };
  }

  const routePoints = [lead.departure_city!, ...lead.intermediate_stops.filter(hasText), lead.arrival_city!];
  const routeSegments = buildRouteSegments(routePoints);
  const rules = await deps.lookupActivePricingRules();
  const segmentQuotes: Array<{
    from: string;
    to: string;
    distanceKm: number;
    source?: QuoteOutput["breakdown"]["distance"]["source"];
    quote: QuoteOutput;
  }> = [];

  for (const segment of routeSegments) {
    const distance = await deps.resolveDistance({
      departureCity: segment.from,
      arrivalCity: segment.to,
    });

    if (!distance.ok) {
      await deps.markHumanReview(leadId, distance.review);

      return {
        ok: false,
        status: "HUMAN_REVIEW",
        reason: distance.review,
      };
    }

    const result = calculer_devis(
      {
        leadId,
        departureCity: segment.from,
        arrivalCity: segment.to,
        departureDate: lead.departure_date!,
        requestDate: deps.getRequestDate(),
        tripType: lead.trip_type!,
        passengerCount: lead.passenger_count!,
        distanceKm: distance.distanceKm,
        distanceSource: distance.source,
      },
      rules,
    );

    if (!result.ok) {
      await deps.markHumanReview(leadId, result.review);

      return {
        ok: false,
        status: "HUMAN_REVIEW",
        reason: result.review,
      };
    }

    segmentQuotes.push({
      ...segment,
      distanceKm: distance.distanceKm,
      source: distance.source,
      quote: result.quote,
    });
  }

  const optionContribution = calculateOptionContribution({
    lead,
    leadId,
    requestDate: deps.getRequestDate(),
    rules,
    totalDistanceKm: sum(segmentQuotes.map((segment) => segment.distanceKm)),
  });

  const quote = combineSegmentQuotes({
    lead,
    leadId,
    matricesVersion: rules.version,
    optionContribution,
    segmentQuotes,
    vatRate: rules.vatRate,
  });
  const quoteId = await deps.saveQuote({ leadId, quote });

  await deps.updateLeadStatus(leadId, "QUOTE_READY", {
    quoteId,
    quoteNumber: quote.quote_number,
  });
  await deps.logAuditEvent({
    entityType: "quote",
    entityId: quoteId,
    action: "QUOTE_CREATED",
    metadata: {
      leadId,
      quoteNumber: quote.quote_number,
      deterministicHash: quote.deterministic_hash,
      routeSegments: quote.breakdown.routeSegments,
    },
  });

  return {
    ok: true,
    quoteId,
    status: "QUOTE_READY",
    quote: {
      quoteNumber: quote.quote_number,
      vehicleCode: quote.vehicle_code,
      distanceKm: quote.breakdown.distance.distanceKm,
      priceHt: quote.price_ht,
      vatAmount: quote.vat_amount,
      priceTtc: quote.price_ttc,
      departureCity: lead.departure_city!,
      arrivalCity: lead.arrival_city!,
      departureDate: lead.departure_date!,
      passengerCount: lead.passenger_count!,
    },
  };
}

function buildRouteSegments(points: string[]) {
  return points.slice(0, -1).map((from, index) => ({
    from,
    to: points[index + 1]!,
  }));
}

function calculateOptionContribution(input: {
  lead: LeadRecord;
  leadId: string;
  requestDate: string;
  rules: Awaited<ReturnType<typeof lookupActivePricingRules>>;
  totalDistanceKm: number;
}) {
  const result = calculer_devis(
    {
      leadId: input.leadId,
      departureCity: input.lead.departure_city!,
      arrivalCity: input.lead.arrival_city!,
      departureDate: input.lead.departure_date!,
      requestDate: input.requestDate,
      tripType: input.lead.trip_type!,
      passengerCount: input.lead.passenger_count!,
      distanceKm: input.totalDistanceKm,
      options: normalizeQuoteOptions(input.lead.options),
    },
    input.rules,
  );

  if (!result.ok) {
    return { optionsTotalEur: 0, priceHtEur: 0, items: [] };
  }

  const optionsTotalEur = result.quote.breakdown.options.totalEur;
  const priceHtEur = roundCurrency(optionsTotalEur * (1 + input.rules.marginRate));
  return {
    optionsTotalEur,
    priceHtEur,
    items: result.quote.breakdown.options.items ?? [],
  };
}

function combineSegmentQuotes(input: {
  lead: LeadRecord;
  leadId: string;
  matricesVersion: string;
  optionContribution: ReturnType<typeof calculateOptionContribution>;
  segmentQuotes: Array<{
    from: string;
    to: string;
    distanceKm: number;
    source?: QuoteOutput["breakdown"]["distance"]["source"];
    quote: QuoteOutput;
  }>;
  vatRate: number;
}): QuoteOutput {
  const totalDistanceKm = roundCurrency(sum(input.segmentQuotes.map((segment) => segment.distanceKm)));
  const transportHt = roundCurrency(sum(input.segmentQuotes.map((segment) => segment.quote.price_ht)));
  const priceHt = roundCurrency(transportHt + input.optionContribution.priceHtEur);
  const vatAmount = roundCurrency(priceHt * input.vatRate);
  const priceTtc = roundCurrency(priceHt + vatAmount);
  const segmentLines = input.segmentQuotes.map((segment) => ({
    label: `${segment.from} -> ${segment.to}`,
    amountEur: segment.quote.price_ht,
  }));
  const optionLines =
    input.optionContribution.priceHtEur > 0
      ? [{ label: "Options", amountEur: input.optionContribution.priceHtEur }]
      : [];
  const quoteLines = [...segmentLines, ...optionLines];
  const routeSegments = input.segmentQuotes.map((segment) => ({
    from: segment.from,
    to: segment.to,
    distanceKm: segment.distanceKm,
    priceHtEur: segment.quote.price_ht,
    priceTtcEur: segment.quote.price_ttc,
    source: segment.source,
  }));
  const firstQuote = input.segmentQuotes[0]!.quote;
  const lastQuote = input.segmentQuotes.at(-1)!.quote;
  const deterministicHash = sha256(
    stableStringify({
      leadId: input.leadId,
      routeSegments,
      optionContribution: input.optionContribution,
      priceHt,
      vatAmount,
      priceTtc,
      matricesVersion: input.matricesVersion,
    }),
  );

  return {
    quote_number: `NT-${deterministicHash.slice(0, 10).toUpperCase()}`,
    vehicle_code: firstQuote.vehicle_code,
    price_ht: priceHt,
    vat_rate: input.vatRate,
    vat_amount: vatAmount,
    price_ttc: priceTtc,
    deterministic_hash: deterministicHash,
    matrices_version: input.matricesVersion,
    breakdown: {
      routeSegments,
      quoteLines,
      distance: {
        distanceKm: totalDistanceKm,
        source: "api",
        pricingMode: "long_distance_formula",
        oneWayBaseEur: transportHt,
      },
      trip: {
        type: input.lead.trip_type!,
        multiplier: input.lead.trip_type === "round_trip" ? 2 : 1,
        baseAfterTripTypeEur: transportHt,
      },
      coefficients: {
        seasonality: firstQuote.breakdown.coefficients.seasonality,
        leadTime: firstQuote.breakdown.coefficients.leadTime,
        capacity: firstQuote.breakdown.coefficients.capacity,
        total: firstQuote.breakdown.coefficients.total,
        amountEur: sum(input.segmentQuotes.map((segment) => segment.quote.breakdown.coefficients.amountEur)),
      },
      options: {
        items: input.optionContribution.items,
        tollPackageEur: 0,
        totalEur: input.optionContribution.optionsTotalEur,
      },
      margin: {
        rate: firstQuote.breakdown.margin.rate,
        amountEur: roundCurrency(sum(input.segmentQuotes.map((segment) => segment.quote.breakdown.margin.amountEur)) + input.optionContribution.priceHtEur - input.optionContribution.optionsTotalEur),
      },
      vat: {
        rate: input.vatRate,
        amountEur: vatAmount,
      },
      totals: {
        beforeMarginEur: roundCurrency(
          sum(input.segmentQuotes.map((segment) => segment.quote.breakdown.totals.beforeMarginEur)) +
            input.optionContribution.optionsTotalEur,
        ),
        priceHtEur: priceHt,
        priceTtcEur: priceTtc,
      },
    },
  };
}

function sum(values: number[]) {
  return roundCurrency(values.reduce((total, value) => total + value, 0));
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

function normalizeQuoteOptions(options: QuoteOptions | Record<string, unknown> | null): QuoteOptions | undefined {
  if (!options) {
    return undefined;
  }
  const optionRecord = options as Record<string, unknown>;

  return {
    guideDays: toOptionalNumber(optionRecord.guideDays ?? optionRecord.guide_days),
    driverNights: toOptionalNumber(optionRecord.driverNights ?? optionRecord.driver_nights),
    tollsIncluded: toOptionalBoolean(optionRecord.tollsIncluded ?? optionRecord.tolls_included),
    tollPackageEur: toOptionalNumber(optionRecord.tollPackageEur ?? optionRecord.toll_package_eur),
    // MVP requested-option flags stored on the lead (detected from the chat).
    guide: toOptionalBoolean(optionRecord.guide),
    driverOvernight: toOptionalBoolean(optionRecord.driverOvernight ?? optionRecord.driver_overnight),
    tolls: toOptionalBoolean(optionRecord.tolls),
  };
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
