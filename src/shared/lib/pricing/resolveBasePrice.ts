import { routePricing } from "@/data/route-pricing";

export type BasePriceResolution =
 | {
   source: "route_pricing";
   routeKey: string;
   distanceKm: number;
   demoBasePriceEur: number;
  }
 | {
   source: "controlled_distance";
   distanceKm: number;
  }
 | null;

function normalizeCity(city: string) {
 return city.trim().toLowerCase();
}

export function resolveBasePrice(
 departureCity: string,
 arrivalCity: string,
 controlledDistanceKm?: number
): BasePriceResolution {
 const departure = normalizeCity(departureCity);
 const arrival = normalizeCity(arrivalCity);
 const key = `${departure}__${arrival}`;
 const reverseKey = `${arrival}__${departure}`;
 const route = routePricing[key] ?? routePricing[reverseKey];

 if (route) {
  return {
   source: "route_pricing",
   routeKey: routePricing[key] ? key : reverseKey,
   distanceKm: route.distanceKm,
   demoBasePriceEur: route.demoBasePriceEur
  };
 }

 if (controlledDistanceKm && controlledDistanceKm > 0) {
  return {
   source: "controlled_distance",
   distanceKm: controlledDistanceKm
  };
 }

 return null;
}
