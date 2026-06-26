export const runtime = "nodejs";

import { runClarification } from "@/features/ai-orchestration/services/runClarification";

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json(await runClarification(body));
}