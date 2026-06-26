import { z } from "zod";

export const HumanReviewSchema = z.object({
  leadId: z.string().min(1),
  reason: z.string().min(1),
  summary: z.string().optional(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
  assignedTo: z.string().nullable().optional()
});

export type HumanReviewInput = z.infer<typeof HumanReviewSchema>;
