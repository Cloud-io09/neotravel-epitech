import { z } from "zod";

export const followupSchema = z.object({
 leadId: z.string(),
 quoteId: z.string().optional(),
 channel: z.literal("email"),
 dueAt: z.string()
});

export type FollowupSchemaInput = z.infer<typeof followupSchema>;
