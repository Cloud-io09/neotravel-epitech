import { routePricing } from "@/data/route-pricing";
import { resolveCityCoords } from "@/features/lead-detail/components/cityCoords";
import type { TripType } from "@/shared/types/lead";

export type DemandRoutePreview = {
  distanceKm: number;
  durationMinutes: number;
  labels: string[];
};

export type DemandRouteSummaryInput = {
  departureCity: string | null;
  arrivalCity: string | null;
  intermediateStops?: string[];
  tripType: TripType | null;
  routePreview?: DemandRoutePreview | null;
};

export type DemandRouteSummary = {
  departureCity: string | null;
  arrivalCity: string | null;
  hasRoute: boolean;
  distanceKm: number | null;
  durationMinutes: number | null;
  displayDistance: string;
  displayDuration: string;
  source: "waiting" | "ors" | "seed" | "estimated" | "unavailable";
};

export function buildDemandRouteSummary(input: DemandRouteSummaryInput): DemandRouteSummary {
  const departureCity = cleanCityLabel(input.departureCity);
  const arrivalCity = cleanCityLabel(input.arrivalCity);
  const hasRoute = Boolean(departureCity && arrivalCity);

  if (!hasRoute) {
    return {
      departureCity,
      arrivalCity,
      hasRoute,
      distanceKm: null,
      durationMinutes: null,
      displayDistance: "En attente",
      displayDuration: "En attente",
      source: "waiting",
    };
  }

  const previewMatchesRoute = doesPreviewMatchRoute(input.routePreview, departureCity, arrivalCity);
  const seedDistanceKm = knownRouteDistanceKm(departureCity, arrivalCity);
  const estimatedDistanceKm = estimatedRoadDistanceKm([
    departureCity,
    ...(input.intermediateStops ?? []),
    arrivalCity,
  ]);
  const oneWayDistanceKm =
    previewMatchesRoute && input.routePreview?.distanceKm
      ? input.routePreview.distanceKm
      : seedDistanceKm ?? estimatedDistanceKm;
  const source: DemandRouteSummary["source"] =
    previewMatchesRoute && input.routePreview?.distanceKm
      ? "ors"
      : seedDistanceKm
        ? "seed"
        : estimatedDistanceKm
          ? "estimated"
          : "unavailable";

  if (!oneWayDistanceKm) {
    return {
      departureCity,
      arrivalCity,
      hasRoute,
      distanceKm: null,
      durationMinutes: null,
      displayDistance: "Estimation indisponible",
      displayDuration: "Estimation indisponible",
      source,
    };
  }

  const multiplier = input.tripType === "round_trip" ? 2 : 1;
  const distanceKm = Math.round(oneWayDistanceKm * multiplier * 10) / 10;
  const oneWayDurationMinutes =
    previewMatchesRoute && input.routePreview?.durationMinutes
      ? input.routePreview.durationMinutes
      : Math.round((oneWayDistanceKm / 75) * 60);
  const durationMinutes = oneWayDurationMinutes * multiplier;
  const estimated = source !== "ors";

  return {
    departureCity,
    arrivalCity,
    hasRoute,
    distanceKm,
    durationMinutes,
    displayDistance: formatDistance(distanceKm, estimated),
    displayDuration: formatDuration(durationMinutes, estimated),
    source,
  };
}

function cleanCityLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeRouteLabel(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function routeKey(city: string) {
  return normalizeRouteLabel(city);
}

function knownRouteDistanceKm(departure: string | null, arrival: string | null) {
  if (!departure || !arrival) return null;
  const direct = `${routeKey(departure)}__${routeKey(arrival)}`;
  const reverse = `${routeKey(arrival)}__${routeKey(departure)}`;
  return routePricing[direct]?.distanceKm ?? routePricing[reverse]?.distanceKm ?? null;
}

function doesPreviewMatchRoute(
  routePreview: DemandRoutePreview | null | undefined,
  departureCity: string | null,
  arrivalCity: string | null,
) {
  if (!routePreview?.labels?.length || !departureCity || !arrivalCity) return false;
  return (
    normalizeRouteLabel(routePreview.labels[0]) === normalizeRouteLabel(departureCity) &&
    normalizeRouteLabel(routePreview.labels.at(-1)) === normalizeRouteLabel(arrivalCity)
  );
}

function estimatedRoadDistanceKm(labels: Array<string | null | undefined>) {
  const normalizedLabels = labels.map((label) => label?.trim()).filter((label): label is string => Boolean(label));
  const coordinates = normalizedLabels.map((label) => resolveCityCoords(label));

  if (coordinates.length < 2) return null;

  const departureCoords = coordinates[0];
  const arrivalCoords = coordinates.at(-1);
  if (!departureCoords || !arrivalCoords) return null;

  if (coordinates.some((coords) => !coords)) {
    return Math.round(haversineKm(departureCoords, arrivalCoords) * 1.18);
  }

  const knownCoordinates = coordinates as [number, number][];
  const straightLineKm = knownCoordinates.slice(1).reduce((total, coords, index) => {
    return total + haversineKm(knownCoordinates[index], coords);
  }, 0);

  return Math.round(straightLineKm * 1.18);
}

function haversineKm(from: [number, number], to: [number, number]) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const fromLatRad = toRadians(fromLat);
  const toLatRad = toRadians(toLat);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(lngDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(value: number, estimated: boolean) {
  return `${estimated ? "≈ " : ""}${value} km`;
}

function formatDuration(minutes: number, estimated: boolean) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const prefix = estimated ? "≈ " : "";
  if (!hours) return `${prefix}${rest} min`;

  return `${prefix}${hours} h ${String(rest).padStart(2, "0")}`;
}
