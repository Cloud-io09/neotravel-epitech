import type {
  CapacityPricingRule,
  LeadTimePricingRule,
  PricingRules,
  SeasonPricingRule,
} from "../domain/types";
import { createServerSupabaseClient } from "../supabase/server";
import { DEFAULT_OPTION_RATES } from "./pricing-rules";

type RawPricingRules = {
  forfait_distance_grid: Array<{
    distance_km: number;
    price_eur: number;
  }>;
  long_distance: {
    price_per_km: number;
  };
  seasonality: {
    low: SeasonPricingRule;
    medium: SeasonPricingRule;
    high: SeasonPricingRule;
    very_high: SeasonPricingRule;
  };
  departure_delay: {
    priority: {
      max_days_inclusive: number;
      coefficient: number;
    };
    urgent: {
      min_days_exclusive: number;
      max_days_inclusive: number;
      coefficient: number;
    };
    normal: {
      min_days_exclusive: number;
      max_days_inclusive: number;
      coefficient: number;
    };
    three_months_plus: {
      min_days_exclusive: number;
      coefficient: number;
    };
  };
  capacity: Array<{
    min_passengers_exclusive?: number;
    max_passengers_inclusive: number;
    coefficient: number;
  }>;
  options?: {
    guide_day_rate_eur?: number;
    driver_night_rate_eur?: number;
  };
  margin_rate: number;
  vat_rate: number;
};

type PricingMatrixRow = {
  version: string;
  rules: RawPricingRules;
};

export async function lookupActivePricingRules(): Promise<PricingRules> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("pricing_matrices")
    .select("version, rules")
    .eq("is_active", true)
    .single();

  if (error) {
    throw new Error(`Unable to load active pricing matrix: ${error.message}`);
  }

  if (!data) {
    throw new Error("No active pricing matrix found.");
  }

  return mapPricingMatrix(data as PricingMatrixRow);
}

function mapPricingMatrix(row: PricingMatrixRow): PricingRules {
  const rules = row.rules;

  return {
    version: row.version,
    forfaitDistanceGrid: rules.forfait_distance_grid.map((rule) => ({
      distanceKm: rule.distance_km,
      priceEur: rule.price_eur,
    })),
    longDistanceRatePerKmPerLeg: rules.long_distance.price_per_km,
    seasonality: {
      low: rules.seasonality.low,
      medium: rules.seasonality.medium,
      high: rules.seasonality.high,
      veryHigh: rules.seasonality.very_high,
    },
    leadTime: mapLeadTimeRules(rules),
    capacity: mapCapacityRules(rules),
    optionRates: {
      guideDayRateEur: rules.options?.guide_day_rate_eur ?? DEFAULT_OPTION_RATES.guideDayRateEur,
      driverNightRateEur: rules.options?.driver_night_rate_eur ?? DEFAULT_OPTION_RATES.driverNightRateEur,
    },
    marginRate: rules.margin_rate,
    vatRate: rules.vat_rate,
  };
}

function mapLeadTimeRules(rules: RawPricingRules): LeadTimePricingRule[] {
  return [
    {
      code: "DD_PRIORITAIRE",
      maxDaysInclusive: rules.departure_delay.priority.max_days_inclusive,
      coefficient: rules.departure_delay.priority.coefficient,
    },
    {
      code: "DD_URGENT",
      minDaysExclusive: rules.departure_delay.urgent.min_days_exclusive,
      maxDaysInclusive: rules.departure_delay.urgent.max_days_inclusive,
      coefficient: rules.departure_delay.urgent.coefficient,
    },
    {
      code: "DD_NORMAL",
      minDaysExclusive: rules.departure_delay.normal.min_days_exclusive,
      maxDaysInclusive: rules.departure_delay.normal.max_days_inclusive,
      coefficient: rules.departure_delay.normal.coefficient,
    },
    {
      code: "DD_3MOISETPLUS",
      minDaysExclusive: rules.departure_delay.three_months_plus.min_days_exclusive,
      coefficient: rules.departure_delay.three_months_plus.coefficient,
    },
  ];
}

function mapCapacityRules(rules: RawPricingRules): CapacityPricingRule[] {
  return rules.capacity.map((rule) => ({
    minPassengersExclusive: rule.min_passengers_exclusive,
    maxPassengersInclusive: rule.max_passengers_inclusive,
    coefficient: rule.coefficient,
    vehicleCode: getVehicleCode(rule.max_passengers_inclusive),
  }));
}

function getVehicleCode(maxPassengersInclusive: number): string {
  if (maxPassengersInclusive <= 19) {
    return "MINIBUS_19";
  }

  return `COACH_${maxPassengersInclusive}`;
}
