import { runDemandExtraction } from "@/features/ai-orchestration/services/runDemandExtraction";

export async function POST(request: Request) {
 const body = await request.json();
 return Response.json(await runDemandExtraction(body.message));
}
