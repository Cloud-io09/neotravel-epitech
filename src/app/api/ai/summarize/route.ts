export const runtime = "nodejs";

import { runHumanReviewSummary } from "@/features/ai-orchestration/services/runHumanReviewSummary";

export async function POST(request: Request) {
  const body = await request.json();
  return Response.json(await runHumanReviewSummary(body));
}