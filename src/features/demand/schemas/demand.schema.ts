import { z } from "zod";

export const TripTypeSchema = z.enum(["one_way", "round_trip"]);

export const demandSchema = z.object({
 rawMessage: z.string().optional(),
 organization: z.string().nullable(),
 email: z.string().email().nullable(),
 departureCity: z.string().nullable(),
 arrivalCity: z.string().nullable(),
 departureDate: z.string().nullable(),
 returnDate: z.string().nullable(),
 passengerCount: z.number().int().positive().nullable(),
 tripType: TripTypeSchema.nullable(),
 options: z.array(z.string())
});

export const LeadQualificationSchema = demandSchema.extend({
 confidence: z.number().min(0).max(1).default(1),
 missingFields: z.array(z.string()).default([]),
 shouldEscalate: z.boolean().default(false),
 humanReviewReason: z.string().nullable().default(null)
});

export type DemandSchemaInput = z.infer<typeof demandSchema>;
export type LeadQualification = z.infer<typeof LeadQualificationSchema>;
