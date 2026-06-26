import type { DistanceProvider } from "../distanceProvider";
import { getDistanceConfig } from "../distanceProvider";

type OrsFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: { confidence?: number; label?: string };
};

type OrsGeocodeResponse = {
  features?: OrsFeature[];
};

type OrsDirectionResponse = {
  routes?: Array<{
    summary?: {
      distance?: number;
      duration?: number;
    };
  }>;
};

async function fetchJson<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocode(label: string, apiKey: string, timeoutMs: number) {
  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("text", label);
  url.searchParams.set("size", "1");
  url.searchParams.set("boundary.country", "FR");

  const response = await fetchJson<OrsGeocodeResponse>(url.toString(), { method: "GET" }, timeoutMs);
  const feature = response.features?.[0];
  const coordinates = feature?.geometry?.coordinates;
  if (!coordinates || coordinates.length !== 2) return null;

  return {
    coordinates,
    confidence: feature.properties?.confidence ?? 0.8
  };
}

export const openRouteServiceProvider: DistanceProvider = {
  name: "openrouteservice",
  async resolveDistance(input) {
    const config = getDistanceConfig();
    if (!config.openRouteServiceApiKey) return null;

    const departure = await geocode(input.departureLabel, config.openRouteServiceApiKey, config.timeoutMs);
    const arrival = await geocode(input.arrivalLabel, config.openRouteServiceApiKey, config.timeoutMs);
    if (!departure || !arrival) throw new Error("DISTANCE_GEOCODING_AMBIGUOUS");

    const response = await fetchJson<OrsDirectionResponse>(
      "https://api.openrouteservice.org/v2/directions/driving-car",
      {
        method: "POST",
        headers: {
          Authorization: config.openRouteServiceApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coordinates: [departure.coordinates, arrival.coordinates],
          instructions: false
        })
      },
      config.timeoutMs
    );

    const summary = response.routes?.[0]?.summary;
    if (!summary?.distance || !summary.duration) throw new Error("DISTANCE_PROVIDER_NO_ROUTE");

    return {
      distanceKm: Math.round((summary.distance / 1000) * 10) / 10,
      durationMinutes: Math.round(summary.duration / 60),
      provider: "openrouteservice",
      source: "openrouteservice",
      providerStatus: "ok",
      confidence: Math.min(departure.confidence, arrival.confidence, 0.9),
      calculatedAt: new Date().toISOString()
    };
  }
};
