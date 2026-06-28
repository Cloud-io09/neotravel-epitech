import { isAdminAuthorized } from "../auth/requireAdmin";

export async function isN8nRequestAuthorized(request: Request) {
  if (await isAdminAuthorized()) return true;

  const expected = process.env.N8N_WEBHOOK_SECRET;
  if (!expected && process.env.NODE_ENV !== "production") return true;

  return Boolean(expected && request.headers.get("x-neotravel-webhook-secret") === expected);
}
