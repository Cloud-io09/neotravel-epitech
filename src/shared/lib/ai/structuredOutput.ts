import { z } from "zod";

export function parseStructuredOutput<TSchema extends z.ZodTypeAny>(
 schema: TSchema,
 output: unknown
): z.infer<TSchema> {
 return schema.parse(output);
}
