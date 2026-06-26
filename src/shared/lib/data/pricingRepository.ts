import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";

type PricingRuleRow = {
  key: string;
  ruleType: string;
  label: string;
  value: unknown;
  unit: string;
  active: boolean;
  version: number;
  metadata?: Record<string, unknown>;
};

type RoutePricingRow = {
  routeKey: string;
  departureCity: string;
  arrivalCity: string;
  distanceKm: number | null;
  basePriceEur: number;
  active: boolean;
  version: number;
};

export async function listPricingRules(): Promise<PricingRuleRow[]> {
  if (shouldUseDemoData()) return demoStore.listPricingRules();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("pricing_rules")
    .select("rule_key, rule_type, label, value, unit, active, version, metadata")
    .order("rule_key", { ascending: true })
    .order("version", { ascending: false });

  if (error) throw error;
  return data.map((rule) => ({
    key: rule.rule_key,
    ruleType: rule.rule_type,
    label: rule.label,
    value: rule.value,
    unit: rule.unit,
    active: rule.active,
    version: rule.version,
    metadata: rule.metadata
  }));
}

export async function listRoutePricing(): Promise<RoutePricingRow[]> {
  if (shouldUseDemoData()) return demoStore.listRoutePricing();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("route_pricing")
    .select("departure_city, arrival_city, distance_km, base_price_eur, active, version")
    .order("departure_city", { ascending: true })
    .order("version", { ascending: false });

  if (error) throw error;
  return data.map((route) => ({
    routeKey: `${route.departure_city.toLowerCase()}__${route.arrival_city.toLowerCase()}`,
    departureCity: route.departure_city,
    arrivalCity: route.arrival_city,
    distanceKm: route.distance_km,
    basePriceEur: route.base_price_eur,
    active: route.active,
    version: route.version
  }));
}
