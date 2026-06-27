import { createDistanceCache } from "@/shared/lib/data/distanceCacheRepository";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { DistanceRequestSchema, type DistanceResolveResult, type DistanceResolution } from "./distanceSchemas";
import { buildExpiresAt, getDistanceConfig, normalizeLocationLabel } from "./distanceProvider";
import { cachedDistanceProvider } from "./providers/cachedDistanceProvider";
import { openRouteServiceProvider } from "./providers/openRouteServiceProvider";
import { osrmProvider } from "./providers/osrmProvider";

function humanReview(reason: string, providerStatus?: string): DistanceResolveResult {
 return { status: "HUMAN_REVIEW", reason, providerStatus };
}

function isPlausibleDistance(distance: DistanceResolution) {
 const config = getDistanceConfig();
 return distance.distanceKm > 0 && distance.distanceKm <= config.maxKm;
}

async function persistDistance(input: { departureLabel: string; arrivalLabel: string }, resolution: DistanceResolution) {
 const config = getDistanceConfig();
 const expiresAt = buildExpiresAt(resolution.calculatedAt, config.cacheTtlDays);
 await createDistanceCache({
  ...resolution,
  departureLabel: input.departureLabel,
  arrivalLabel: input.arrivalLabel,
  departureNormalized: normalizeLocationLabel(input.departureLabel),
  arrivalNormalized: normalizeLocationLabel(input.arrivalLabel),
  expiresAt
 });
}

export async function resolveDistance(input: unknown): Promise<DistanceResolveResult> {
 const parsed = DistanceRequestSchema.safeParse(input);
 if (!parsed.success) return humanReview("DISTANCE_INPUT_INVALID", "validation_failed");

 const config = getDistanceConfig();
 const cached = await cachedDistanceProvider.resolveDistance(parsed.data);
 if (cached) return cached;

 if (config.provider === "controlled") {
  return humanReview("DISTANCE_NOT_FOUND_IN_CONTROLLED_BASE", "controlled_only");
 }

 const providers =
  config.provider === "osrm"
   ? [osrmProvider]
   : config.provider === "openrouteservice"
    ? [openRouteServiceProvider]
    : [openRouteServiceProvider, osrmProvider];

 for (const provider of providers) {
  try {
   const resolution = await provider.resolveDistance(parsed.data);
   if (!resolution) continue;
   if (!isPlausibleDistance(resolution)) {
    return humanReview("DISTANCE_OUT_OF_ALLOWED_RANGE", resolution.providerStatus);
   }

   await persistDistance(parsed.data, resolution);
   await createAuditLog({
    entityType: "distance",
    entityId: `${normalizeLocationLabel(parsed.data.departureLabel)}__${normalizeLocationLabel(parsed.data.arrivalLabel)}`,
    action: auditActions.distanceResolved,
    actor: "system",
    input: parsed.data,
    output: resolution,
    payload: { provider: resolution.provider, source: resolution.source }
   });
   return resolution;
  } catch (error) {
   return humanReview(error instanceof Error ? error.message : "DISTANCE_PROVIDER_FAILED", provider.name);
  }
 }

 return humanReview("DISTANCE_PROVIDER_NOT_CONFIGURED", config.provider);
}
