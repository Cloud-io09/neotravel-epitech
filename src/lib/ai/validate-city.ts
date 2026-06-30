import { getDistanceConfig } from "@/shared/lib/distance/distanceProvider";

// Below this Pelias confidence a match is fuzzy/garbage rather than a real French place.
const MIN_CITY_CONFIDENCE = 0.5;

type OrsGeocodeResponse = {
  features?: Array<{ properties?: { confidence?: number } }>;
};

/**
 * Checks that a city name resolves to a real French locality via the geocoder. Returns true
 * for an empty input or when the geocoder isn't configured / errors out (availability over
 * strictness — we never block a legitimate demand because ORS is down).
 */
export async function isPlausibleCity(name: string | null | undefined): Promise<boolean> {
  const label = name?.trim();
  if (!label) return true;

  const config = getDistanceConfig();
  if (!config.openRouteServiceApiKey) return true;

  const url = new URL("https://api.openrouteservice.org/geocode/search");
  url.searchParams.set("api_key", config.openRouteServiceApiKey);
  url.searchParams.set("text", label);
  url.searchParams.set("size", "1");
  url.searchParams.set("boundary.country", "FR");
  // Bias toward actual places (cities/towns/admin areas), not venues or street addresses.
  url.searchParams.set("layers", "locality,localadmin,region,macroregion");

  const controller = new AbortController();
  // Cap the timeout: this is a sanity check, it must not slow the chat turn much if ORS lags.
  const timeout = setTimeout(() => controller.abort(), Math.min(config.timeoutMs ?? 3000, 3000));
  try {
    const response = await fetch(url.toString(), { method: "GET", signal: controller.signal });
    if (!response.ok) return true;
    const data = (await response.json()) as OrsGeocodeResponse;
    const confidence = data.features?.[0]?.properties?.confidence ?? 0;
    return confidence >= MIN_CITY_CONFIDENCE;
  } catch {
    return true;
  } finally {
    clearTimeout(timeout);
  }
}
