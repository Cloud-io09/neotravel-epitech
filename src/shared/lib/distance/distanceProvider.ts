import type { DistanceRequest, DistanceResolution } from "./distanceSchemas";

export type DistanceProvider = {
 name: DistanceResolution["provider"];
 resolveDistance(input: DistanceRequest): Promise<DistanceResolution | null>;
};

export function normalizeLocationLabel(value: string) {
 return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getDistanceConfig() {
 return {
  provider: process.env.DISTANCE_PROVIDER ?? "hybrid",
  cacheTtlDays: Number(process.env.DISTANCE_CACHE_TTL_DAYS ?? 30),
  timeoutMs: Number(process.env.DISTANCE_API_TIMEOUT_MS ?? 3000),
  maxKm: Number(process.env.DISTANCE_MAX_KM ?? 1500),
  openRouteServiceApiKey: process.env.OPENROUTESERVICE_API_KEY ?? "",
  osrmBaseUrl: process.env.OSRM_BASE_URL ?? ""
 };
}

export function buildExpiresAt(calculatedAt: string, ttlDays: number) {
 const date = new Date(calculatedAt);
 date.setUTCDate(date.getUTCDate() + ttlDays);
 return date.toISOString();
}

export function isFresh(expiresAt: string, now = new Date()) {
 return new Date(expiresAt).getTime() > now.getTime();
}
