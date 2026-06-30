import { describe, expect, it } from "vitest";

import { buildDemandRouteSummary } from "./buildRouteSummary";

describe("buildDemandRouteSummary", () => {
  it("returns waiting only when departure or arrival is missing", () => {
    const summary = buildDemandRouteSummary({
      departureCity: "Paris",
      arrivalCity: null,
      tripType: "one_way",
    });

    expect(summary.displayDistance).toBe("En attente");
    expect(summary.displayDuration).toBe("En attente");
    expect(summary.source).toBe("waiting");
  });

  it("uses ORS preview when it matches the active route", () => {
    const summary = buildDemandRouteSummary({
      departureCity: "Paris",
      arrivalCity: "Marseille",
      tripType: "one_way",
      routePreview: {
        distanceKm: 778.3,
        durationMinutes: 463,
        labels: ["Paris", "Marseille"],
      },
    });

    expect(summary.displayDistance).toBe("778.3 km");
    expect(summary.displayDuration).toBe("7 h 43");
    expect(summary.source).toBe("ors");
  });

  it("falls back to a local estimate when ORS preview is absent", () => {
    const summary = buildDemandRouteSummary({
      departureCity: "Paris",
      arrivalCity: "Marseille",
      tripType: "one_way",
    });

    expect(summary.displayDistance).not.toBe("En attente");
    expect(summary.displayDuration).not.toBe("En attente");
    expect(summary.distanceKm).toBeGreaterThan(700);
    expect(summary.durationMinutes).toBeGreaterThan(300);
    expect(summary.source).toBe("estimated");
  });

  it("doubles distance and duration for round trips", () => {
    const summary = buildDemandRouteSummary({
      departureCity: "Paris",
      arrivalCity: "Marseille",
      tripType: "round_trip",
      routePreview: {
        distanceKm: 778.3,
        durationMinutes: 463,
        labels: ["Paris", "Marseille"],
      },
    });

    expect(summary.distanceKm).toBe(1556.6);
    expect(summary.durationMinutes).toBe(926);
    expect(summary.displayDistance).toBe("1556.6 km");
    expect(summary.displayDuration).toBe("15 h 26");
  });
});
