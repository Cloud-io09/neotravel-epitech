import type { DistanceSource } from "../domain/types";
import { createServerSupabaseClient } from "../supabase/server";

export type ResolveDistanceInput = {
  departureCity: string;
  arrivalCity: string;
};

export type ResolveDistanceResult =
  | { ok: true; distanceKm: number; source: DistanceSource }
  | {
      ok: false;
      review: "UNKNOWN_ROUTE_NO_DISTANCE";
      message: string;
    };

type RoutePricingRow = {
  distance_km: number | string;
  distance_source: DistanceSource;
};

export async function resolveDistance(input: ResolveDistanceInput): Promise<ResolveDistanceResult> {
  const routeKey = buildRouteKey(input.departureCity, input.arrivalCity);
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("route_pricing")
    .select("distance_km, distance_source")
    .eq("route_key", routeKey)
    .eq("distance_status", "resolved")
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to resolve route distance: ${error.message}`);
  }

  if (!data) {
    return {
      ok: false,
      review: "UNKNOWN_ROUTE_NO_DISTANCE",
      message: `Distance inconnue pour ${input.departureCity} → ${input.arrivalCity}.`,
    };
  }

  const row = data as RoutePricingRow;
  const distanceKm = Number(row.distance_km);

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return {
      ok: false,
      review: "UNKNOWN_ROUTE_NO_DISTANCE",
      message: `Distance invalide pour ${input.departureCity} → ${input.arrivalCity}.`,
    };
  }

  return {
    ok: true,
    distanceKm,
    source: row.distance_source,
  };
}

export function buildRouteKey(departureCity: string, arrivalCity: string): string {
  return `${normalizeRoutePart(departureCity)}__${normalizeRoutePart(arrivalCity)}`;
}

function normalizeRoutePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
