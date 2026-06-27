import { z } from "zod";

export const auditSchema = z.object({
 entityType: z.string(),
 entityId: z.string(),
 action: z.string(),
 actor: z.enum(["user", "ai", "system", "human", "commercial", "admin"]),
 inputHash: z.string().length(64).optional(),
 outputHash: z.string().length(64).optional()
});
