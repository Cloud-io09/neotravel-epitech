import { describe, expect, it } from "vitest";

import { detectIntermediateStops } from "./detect-intermediate-stops";

describe("detectIntermediateStops", () => {
  it("flags and extracts an intermediate stop", () => {
    expect(detectIntermediateStops("Mais je veux faire un arrêt à Dijon en fait.")).toEqual({
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
    });
  });

  it("flags route complexity even when the stop city is not stated", () => {
    expect(detectIntermediateStops("Il faudra prévoir une étape sur le trajet.")).toEqual({
      has_intermediate_stop: true,
    });
  });

  it("does not flag an explicit direct route without a stop", () => {
    expect(detectIntermediateStops("Paris Lyon sans arrêt.")).toEqual({});
  });

  it("flags a 'puis' chain and extracts the middle stop", () => {
    expect(detectIntermediateStops("Je veux faire Paris puis Lyon puis Marseille.")).toEqual({
      has_intermediate_stop: true,
      intermediate_stops: ["Lyon"],
    });
  });

  it("flags an arrow chain and extracts the middle stop", () => {
    expect(detectIntermediateStops("Paris → Lyon → Marseille")).toEqual({
      has_intermediate_stop: true,
      intermediate_stops: ["Lyon"],
    });
  });

  it("flags 'plusieurs étapes' without inventing stops", () => {
    expect(detectIntermediateStops("On a plusieurs étapes à prévoir.")).toEqual({
      has_intermediate_stop: true,
    });
  });

  it("flags 'on passe par Dijon'", () => {
    expect(detectIntermediateStops("On passe par Dijon en chemin.")).toMatchObject({
      has_intermediate_stop: true,
    });
  });

  it("extracts common stop synonyms with accented words", () => {
    expect(detectIntermediateStops("Paris à Lyon avec une escale à Dijon")).toEqual({
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
    });
    expect(detectIntermediateStops("Paris à Lyon, étape à Dijon")).toEqual({
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
    });
    expect(detectIntermediateStops("un arrêt intermédiaire à Dijon")).toEqual({
      has_intermediate_stop: true,
      intermediate_stops: ["Dijon"],
    });
  });

  it("does not flag a normal single-arrow A→B route", () => {
    expect(detectIntermediateStops("Paris → Lyon")).toEqual({});
  });
});
