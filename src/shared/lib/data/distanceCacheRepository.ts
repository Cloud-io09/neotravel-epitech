import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { DistanceCacheEntry } from "@/shared/lib/distance/distanceSchemas";
import { normalizeLocationLabel } from "@/shared/lib/distance/distanceProvider";

function toCamel(row: Record<string, unknown>): DistanceCacheEntry {
  return {
    id: String(row.id),
    departureLabel: String(row.departure_label),
    arrivalLabel: String(row.arrival_label),
    departureNormalized: String(row.departure_normalized),
    arrivalNormalized: String(row.arrival_normalized),
    distanceKm: Number(row.distance_km),
    durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
    provider: row.provider as DistanceCacheEntry["provider"],
    source: row.source as DistanceCacheEntry["source"],
    providerStatus: String(row.provider_status),
    confidence: Number(row.confidence),
    calculatedAt: String(row.calculated_at),
    expiresAt: String(row.expires_at)
  };
}

function toSnake(input: DistanceCacheEntry) {
  return {
    departure_label: input.departureLabel,
    arrival_label: input.arrivalLabel,
    departure_normalized: input.departureNormalized,
    arrival_normalized: input.arrivalNormalized,
    distance_km: input.distanceKm,
    duration_minutes: input.durationMinutes,
    provider: input.provider,
    source: input.source,
    provider_status: input.providerStatus,
    confidence: input.confidence,
    calculated_at: input.calculatedAt,
    expires_at: input.expiresAt
  };
}

export async function findDistanceCache(departureLabel: string, arrivalLabel: string) {
  const departure = normalizeLocationLabel(departureLabel);
  const arrival = normalizeLocationLabel(arrivalLabel);

  if (shouldUseDemoData()) return demoStore.findDistanceCache(departure, arrival);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("distance_cache")
    .select("*")
    .or(
      `and(departure_normalized.eq.${departure},arrival_normalized.eq.${arrival}),and(departure_normalized.eq.${arrival},arrival_normalized.eq.${departure})`
    )
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? toCamel(data) : null;
}

export async function createDistanceCache(input: DistanceCacheEntry) {
  if (shouldUseDemoData()) return demoStore.createDistanceCache(input);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("distance_cache")
    .upsert(toSnake(input), { onConflict: "departure_normalized,arrival_normalized" })
    .select("*")
    .single();

  if (error) throw error;
  return toCamel(data);
}
