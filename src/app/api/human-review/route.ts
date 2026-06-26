import { z } from "zod";

import { getDashboardData } from "@/features/dashboard/services/getDashboardData";
import { markHumanReview } from "../../../lib/leads/lead-service";

export const runtime = "nodejs";

const HumanReviewSchema = z.object({
  leadId: z.string().uuid(),
  reason: z.string().trim().min(1),
});

export async function GET(): Promise<Response> {
  const { leads } = await getDashboardData();
  return Response.json(leads.filter((lead) => lead.status === "HUMAN_REVIEW"));
}

export async function POST(request: Request): Promise<Response> {
  const parsed = HumanReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Payload invalide." }, { status: 400 });

  await markHumanReview(parsed.data.leadId, parsed.data.reason);
  return Response.json({ status: "HUMAN_REVIEW", leadId: parsed.data.leadId }, { status: 201 });
}
