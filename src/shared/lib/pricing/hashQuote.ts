import { createHash } from "node:crypto";

function stableNormalize(value: unknown): unknown {
 if (Array.isArray(value)) return value.map(stableNormalize);
 if (value && typeof value === "object") {
  return Object.fromEntries(
   Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, stableNormalize(item)])
  );
 }
 return value;
}

export function hashQuote(payload: unknown) {
 return createHash("sha256").update(JSON.stringify(stableNormalize(payload))).digest("hex");
}
