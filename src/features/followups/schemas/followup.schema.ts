import { z } from "zod";

export const FollowupSchema = z.object({
 leadId: z.string().min(1),
 quoteId: z.string().optional(),
 channel: z.literal("email"),
 status: z.enum(["SCHEDULED", "SENT", "OPENED", "REPLIED"]).default("SCHEDULED"),
 dueAt: z.string().min(1)
});

export type FollowupInput = z.infer<typeof FollowupSchema>;
