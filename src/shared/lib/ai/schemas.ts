import { z } from "zod";

export const PromptInjectionCheckSchema = z.object({
  message: z.string().min(1),
  detected: z.boolean(),
  reason: z.string().nullable().default(null)
});

export type PromptInjectionCheck = z.infer<typeof PromptInjectionCheckSchema>;
