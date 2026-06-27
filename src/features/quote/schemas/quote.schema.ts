import { z } from "zod";

const DeterministicHashSchema = z.string().regex(/^[a-f0-9]{64}$/i);

export const quoteSchema = z.object({
 leadId: z.string(),
 totalAmount: z.number().nonnegative(),
 currency: z.literal("EUR")
});

export const QuoteInputSchema = z.object({
 leadId: z.string().min(1),
 departureCity: z.string().min(1),
 arrivalCity: z.string().min(1),
 departureDate: z.string().min(1),
 returnDate: z.string().nullable().optional(),
 passengerCount: z.number().int().positive(),
 tripType: z.enum(["one_way", "round_trip"]),
 options: z.array(z.string()).default([])
});

export const QuoteBreakdownLineSchema = z.object({
 label: z.string(),
 amount: z.number()
});

export const QuoteOutputSchema = z.object({
 quoteId: z.string().min(1),
 leadId: z.string().min(1),
 priceHt: z.number().nonnegative(),
 vatRate: z.literal(0.1),
 vatAmount: z.number().nonnegative(),
 priceTtc: z.number().nonnegative(),
 currency: z.literal("EUR"),
 deterministicHash: DeterministicHashSchema,
 breakdown: z.array(QuoteBreakdownLineSchema)
});

export type QuoteSchemaInput = z.infer<typeof quoteSchema>;
export type QuoteInput = z.infer<typeof QuoteInputSchema>;
export type QuoteOutput = z.infer<typeof QuoteOutputSchema>;
