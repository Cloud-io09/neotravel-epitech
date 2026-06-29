import { listRoutePricing } from "@/shared/lib/data/pricingRepository";
import { findDistanceCache } from "@/shared/lib/data/distanceCacheRepository";
import type { DistanceProvider } from "../distanceProvider";
import { isFresh, normalizeLocationLabel } from "../distanceProvider";

function sameRoute(leftDeparture: string, leftArrival: string, rightDeparture: string, rightArrival: string) {
 const leftD = normalizeLocationLabel(leftDeparture);
 const leftA = normalizeLocationLabel(leftArrival);
 const rightD = normalizeLocationLabel(rightDeparture);
 const rightA = normalizeLocationLabel(rightArrival);
 return (leftD === rightD && leftA === rightA) || (leftD === rightA && leftA === rightD);
}

export const cachedDistanceProvider: DistanceProvider = {
 name: "cache",
 async resolveDistance(input) {
  const cached = await findDistanceCache(input.departureLabel, input.arrivalLabel);
  if (cached && isFresh(cached.expiresAt) && cached.confidence >= 0.8) {
   return {
    distanceKm: cached.distanceKm,
    durationMinutes: cached.durationMinutes,
    provider: "cache",
    source: "cached_validated_distance",
    providerStatus: "cache_hit",
    confidence: cached.confidence,
    calculatedAt: cached.calculatedAt
   };
  }

  const routes = await listRoutePricing();
  const route = routes.find(
   (item) =>
    item.active &&
    item.distanceKm &&
    sameRoute(input.departureLabel, input.arrivalLabel, item.departureCity, item.arrivalCity)
  );

  if (!route?.distanceKm) return null;

  return {
   distanceKm: route.distanceKm,
   durationMinutes: null,
   provider: "cache",
   source: "route_pricing_demo_fixture",
   providerStatus: "route_pricing_hit",
   confidence: 0.95,
   calculatedAt: new Date().toISOString()
  };
 }
};
