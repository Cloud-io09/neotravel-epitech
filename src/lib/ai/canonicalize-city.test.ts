import { describe, expect, it } from "vitest";

import { canonicalizeCity } from "./canonicalize-city";

describe("canonicalizeCity", () => {
  it("corrects a partial city to its canonical name", () => {
    expect(canonicalizeCity("Pari")).toBe("Paris");
    expect(canonicalizeCity("Lyo")).toBe("Lyon");
    expect(canonicalizeCity("Marseill")).toBe("Marseille");
  });

  it("keeps a correct city unchanged (and fixes casing/accents)", () => {
    expect(canonicalizeCity("paris")).toBe("Paris");
    expect(canonicalizeCity("Saint-Etienne")).toBe("Saint-Étienne");
    expect(canonicalizeCity("Lyon")).toBe("Lyon");
  });

  it("corrects a single-typo city (edit distance 1)", () => {
    expect(canonicalizeCity("Lyo")).toBe("Lyon");
    expect(canonicalizeCity("Bordeau")).toBe("Bordeaux");
  });

  it("leaves an unknown town as typed (no risky correction)", () => {
    expect(canonicalizeCity("Paray-le-Monial")).toBe("Paray-le-Monial");
    expect(canonicalizeCity("Trifouillis")).toBe("Trifouillis");
  });

  it("passes through null/empty", () => {
    expect(canonicalizeCity(null)).toBe(null);
    expect(canonicalizeCity("")).toBe("");
  });
});
