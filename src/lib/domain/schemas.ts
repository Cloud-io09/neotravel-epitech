import { z } from "zod";

export const TripTypeSchema = z.enum(["one_way", "round_trip"]);

export const ExtractionDeltaSchema = z.object({
  name: z.string().trim().min(1).optional(),
  contact_name: z.string().trim().min(1).optional(),
  client_type: z.string().trim().min(1).optional(),
  organization: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).optional(),
  departure_city: z.string().trim().min(1).optional(),
  arrival_city: z.string().trim().min(1).optional(),
  departure_date: z.string().trim().optional(),
  return_date: z.string().trim().optional(),
  passenger_count: z.number().int().positive().optional(),
  trip_type: TripTypeSchema.optional(),
});

export type ExtractionDelta = z.infer<typeof ExtractionDeltaSchema>;

export const LeadQualificationSchema = z.object({
  name: z.string().trim().min(1).optional(),
  contact_name: z.string().trim().min(1).optional(),
  client_type: z.string().trim().min(1).optional(),
  organization: z.string().trim().min(1).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().min(1).optional(),
  departure_city: z.string().trim().min(1).optional(),
  arrival_city: z.string().trim().min(1).optional(),
  departure_date: z.string().trim().min(1).optional(),
  return_date: z.string().trim().min(1).optional(),
  passenger_count: z.number().int().optional(),
  trip_type: TripTypeSchema.optional(),
  has_intermediate_stop: z.boolean().optional(),
  intermediate_stops: z.array(z.string().trim().min(1)).optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  free_message: z.string().trim().optional(),
});


export type LeadQualification = z.infer<typeof LeadQualificationSchema>;

export const CRITICAL_LEAD_FIELDS = [
  "departure_city",
  "arrival_city",
  "departure_date",
  "passenger_count",
  "trip_type",
] as const;

export type CriticalLeadField = (typeof CRITICAL_LEAD_FIELDS)[number];

// return_date is conditionally required (round trips only), so it isn't in the base critical
// set but can still appear in missing_fields.
export const MISSING_FIELD_KEYS = [...CRITICAL_LEAD_FIELDS, "return_date"] as const;

export const MissingFieldsSchema = z.object({
  missing_fields: z.array(z.enum(MISSING_FIELD_KEYS)),
  status: z.enum(["QUALIFIED", "INCOMPLETE"]),
});

export type MissingFieldsResult = z.infer<typeof MissingFieldsSchema>;
