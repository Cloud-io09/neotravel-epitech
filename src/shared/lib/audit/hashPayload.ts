import { createHash } from "node:crypto";

const REDACTED_KEYS = new Set([
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "email",
  "phone",
  "contactName"
]);

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, REDACTED_KEYS.has(key) ? "[redacted]" : normalize(item)])
    );
  }
  return value;
}

export function sanitizePayload(payload: unknown): Record<string, unknown> {
  const normalized = normalize(payload);
  if (normalized && typeof normalized === "object" && !Array.isArray(normalized)) {
    return normalized as Record<string, unknown>;
  }
  return { value: normalized };
}

export function hashPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(normalize(payload))).digest("hex");
}
