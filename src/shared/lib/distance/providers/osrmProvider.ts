import type { DistanceProvider } from "../distanceProvider";
import { getDistanceConfig } from "../distanceProvider";

type OsrmResponse = {
 code?: string;
 routes?: Array<{
  distance?: number;
  duration?: number;
 }>;
};

const cityCoordinates: Record<string, [number, number]> = {
 paris: [2.3522, 48.8566],
 lyon: [4.8357, 45.764],
 lille: [3.0573, 50.6292],
 marseille: [5.3698, 43.2965],
 nantes: [-1.5536, 47.2184],
 bordeaux: [-0.5792, 44.8378],
 toulouse: [1.4442, 43.6047],
 montpellier: [3.8767, 43.6119]
};

function normalizeCity(value: string) {
 return value.trim().toLowerCase();
}

export const osrmProvider: DistanceProvider = {
 name: "osrm",
 async resolveDistance(input) {
  const config = getDistanceConfig();
  if (!config.osrmBaseUrl) return null;

  const departure = cityCoordinates[normalizeCity(input.departureLabel)];
  const arrival = cityCoordinates[normalizeCity(input.arrivalLabel)];
  if (!departure || !arrival) return null;

  const baseUrl = config.osrmBaseUrl.replace(/\/$/, "");
  const url = `${baseUrl}/route/v1/driving/${departure.join(",")};${arrival.join(",")}?overview=false`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
   const response = await fetch(url, { signal: controller.signal });
   if (!response.ok) throw new Error(`HTTP_${response.status}`);
   const payload = (await response.json()) as OsrmResponse;
   const route = payload.routes?.[0];
   if (payload.code !== "Ok" || !route?.distance || !route.duration) throw new Error("DISTANCE_PROVIDER_NO_ROUTE");

   return {
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMinutes: Math.round(route.duration / 60),
    provider: "osrm",
    source: "osrm",
    providerStatus: payload.code,
    confidence: 0.8,
    calculatedAt: new Date().toISOString()
   };
  } finally {
   clearTimeout(timeout);
  }
 }
};
