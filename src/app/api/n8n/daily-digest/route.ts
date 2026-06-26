export const runtime = "nodejs";

import { n8nClient } from "@/shared/lib/n8n/n8nClient";

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json(await n8nClient("daily-digest", body));
}