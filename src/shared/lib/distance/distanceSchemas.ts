import { z } from "zod";

export const DistanceProviderNameSchema = z.enum(["cache", "openrouteservice", "osrm"]);
export type DistanceProviderName = z.infer<typeof DistanceProviderNameSchema>;

export const DistanceSourceSchema = z.enum([
  "cached_validated_distance",
  "route_pricing_demo_fixture",
  "openrouteservice",
  "osrm"
]);
export type DistanceSource = z.infer<typeof DistanceSourceSchema>;

export const DistanceRequestSchema = z.object({
  departureLabel: z.string().trim().min(2),
  arrivalLabel: z.string().trim().min(2),
  departureDate: z.string().optional()
});
export type DistanceRequest = z.infer<typeof DistanceRequestSchema>;

export const DistanceResolutionSchema = z.object({
  distanceKm: z.number().positive(),
  durationMinutes: z.number().positive().nullable(),
  provider: DistanceProviderNameSchema,
  source: DistanceSourceSchema,
  providerStatus: z.string().min(1),
  confidence: z.number().min(0).max(1),
  calculatedAt: z.string().datetime()
});
export type DistanceResolution = z.infer<typeof DistanceResolutionSchema>;

export const DistanceCacheEntrySchema = DistanceResolutionSchema.extend({
  id: z.string().optional(),
  departureLabel: z.string(),
  arrivalLabel: z.string(),
  departureNormalized: z.string(),
  arrivalNormalized: z.string(),
  expiresAt: z.string().datetime()
});
export type DistanceCacheEntry = z.infer<typeof DistanceCacheEntrySchema>;

export const DistanceFailureSchema = z.object({
  status: z.literal("HUMAN_REVIEW"),
  reason: z.string().min(1),
  providerStatus: z.string().min(1).optional()
});
export type DistanceFailure = z.infer<typeof DistanceFailureSchema>;

export type DistanceResolveResult = DistanceResolution | DistanceFailure;
