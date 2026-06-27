import { z } from "zod";
import { routePricing } from "@/data/route-pricing";
import { createHumanReview } from "@/features/human-review/services/createHumanReview";
import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { getLeadById, updateLeadRecord } from "@/shared/lib/data/leadRepository";
import { resolveDistance } from "@/shared/lib/distance";
import { AppError } from "@/shared/lib/utils/errors";
import { calculateQuote } from "./calculateQuote";
import { generateQuote } from "./generateQuote";

export const GenerateQuoteForLeadSchema = z.object({
 leadId: z.string().min(1)
});

export type GenerateQuoteForLeadInput = z.infer<typeof GenerateQuoteForLeadSchema>;

function normalizeCity(value: string) {
 return value.trim().toLowerCase();
}

function getControlledRouteDistance(departureCity: string | null, arrivalCity: string | null) {
 if (!departureCity || !arrivalCity) return null;
 const departure = normalizeCity(departureCity);
 const arrival = normalizeCity(arrivalCity);
 const direct = routePricing[`${departure}__${arrival}`];
 const reverse = routePricing[`${arrival}__${departure}`];

 return direct?.distanceKm ?? reverse?.distanceKm ?? null;
}

function toPricedOptionCodes(options: string[]) {
 return options.flatMap((option) => {
  const normalized = option.trim().toLowerCase();
  if (!normalized) return [];
  if (normalized === "guide" || normalized.includes("accompagnateur")) return ["guide"];
  if (normalized === "peages" || normalized === "péages" || normalized.includes("peage")) return ["peages"];
  if (normalized === "nuit_chauffeur" || normalized.includes("nuit chauffeur")) return ["nuit_chauffeur"];

  return [];
 });
}

export async function generateQuoteForLead(input: GenerateQuoteForLeadInput) {
 const lead = await getLeadById(input.leadId);
 if (!lead) throw new AppError("Demande introuvable.", "NOT_FOUND");

 if (lead.status === "INCOMPLETE") {
  throw new AppError("Demande incomplete : impossible de calculer un devis.", "LEAD_INCOMPLETE");
 }

 if (lead.status === "HUMAN_REVIEW") {
  throw new AppError("Demande en reprise humaine : devis automatique bloque.", "LEAD_HUMAN_REVIEW");
 }

 if (lead.status !== "QUALIFIED" && lead.status !== "HIGH_VALUE") {
  throw new AppError("Le devis automatique exige une demande qualifiee.", "FORBIDDEN_QUOTE_STATUS");
 }

 try {
  const controlledDistanceKm = getControlledRouteDistance(lead.departureCity, lead.arrivalCity);
  const distance = controlledDistanceKm
   ? { distanceKm: controlledDistanceKm }
   : await resolveDistance({
     departureLabel: lead.departureCity ?? "",
     arrivalLabel: lead.arrivalCity ?? "",
     departureDate: lead.departureDate ?? undefined
    });

  if ("status" in distance) throw new Error(distance.reason);

  const calculation = calculateQuote({
   departureCity: lead.departureCity ?? undefined,
   arrivalCity: lead.arrivalCity ?? undefined,
   departureDate: lead.departureDate ?? undefined,
   passengerCount: lead.passengerCount ?? undefined,
   options: toPricedOptionCodes(lead.options),
   controlledDistanceKm: distance.distanceKm
  });
  const quote = await generateQuote({ demand: { leadId: lead.id }, calculation });

  await updateLeadRecord(lead.id, { status: "QUOTE_READY" });

  return quote;
 } catch (error) {
  await updateLeadRecord(lead.id, {
   status: "HUMAN_REVIEW",
   humanReviewReason: error instanceof Error ? error.message : "QUOTE_GENERATION_BLOCKED"
  });
  await createHumanReview({
   ...lead,
   leadId: lead.id,
   reason: error instanceof Error ? error.message : "QUOTE_GENERATION_BLOCKED"
  });
  await createAuditLog({
   entityType: "lead",
   entityId: lead.id,
   action: auditActions.statusChanged,
   actor: "system",
   input: { leadId: lead.id },
   output: { status: "HUMAN_REVIEW" },
   payload: {
    reason: error instanceof Error ? error.message : "QUOTE_GENERATION_BLOCKED"
   }
  });
  throw new AppError("Devis automatique bloque, reprise humaine requise.", "LEAD_HUMAN_REVIEW");
 }
}
