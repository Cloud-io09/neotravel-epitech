export const runtime = "nodejs";

import { z } from "zod";
import { getDistanceConfig } from "@/shared/lib/distance";
import { handleApiError, jsonOk } from "@/shared/lib/utils/apiResponse";
import { AppError } from "@/shared/lib/utils/errors";

type GeoJsonLineString = {
  type: "LineString";
  coordinates: [number, number][];
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  bbox?: [number, number, number, number];
  features?: Array<{
    type: "Feature";
    geometry?: GeoJsonLineString;
    properties?: {
      summary?: {
        distance?: number;
        duration?: number;
      };
    };
  }>;
};

type OrsGeocodeResponse = {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: { confidence?: number };
  }>;
};

const RoutePreviewSchema = z.object({
  departure: z.string().trim().min(2),
  arrival: z.string().trim().min(2),
  intermediateStops: z.array(z.string().trim().min(2)).max(5).default([])
});

async function fetchJson<T>(url: string, init: RequestInit, timeoutMs: number): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new AppError(`OpenRouteService HTTP ${response.status}`, "ROUTE_PROVIDER_ERROR");
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
  const coordinates = response.features?.[0]?.geometry?.coordinates;
  if (!coordinates || coordinates.length !== 2) throw new AppError("Adresse ou ville non reconnue.", "ROUTE_GEOCODING_FAILED");

  return coordinates;
}

export async function POST(request: Request) {
  try {
    const input = RoutePreviewSchema.parse(await request.json());
    const config = getDistanceConfig();
    if (!config.openRouteServiceApiKey) throw new AppError("Cle OpenRouteService manquante.", "ROUTE_PROVIDER_NOT_CONFIGURED");

    const labels = [input.departure, ...input.intermediateStops, input.arrival];
    const coordinates = await Promise.all(
      labels.map((label) => geocode(label, config.openRouteServiceApiKey, config.timeoutMs))
    );

    const geojson = await fetchJson<GeoJsonFeatureCollection>(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: config.openRouteServiceApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          coordinates,
          instructions: false
        })
      },
      config.timeoutMs
    );

    const route = geojson.features?.[0];
    const summary = route?.properties?.summary;
    const routeCoordinates = route?.geometry?.coordinates ?? [];
    if (!summary?.distance || !summary.duration || routeCoordinates.length < 2) {
      throw new AppError("Trajet non calcule.", "ROUTE_PROVIDER_NO_ROUTE");
    }

    return jsonOk({
      distanceKm: Math.round((summary.distance / 1000) * 10) / 10,
      durationMinutes: Math.round(summary.duration / 60),
      labels,
      geometry: routeCoordinates,
      bbox: geojson.bbox
    });
  } catch (error) {
    return handleApiError(error);
  }
}