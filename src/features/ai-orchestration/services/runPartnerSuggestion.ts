import { logModelRun } from "@/shared/lib/audit";
import { partners } from "@/features/partners/components/partnerData";

type PartnerSuggestionInput = {
 departureZone?: string;
 arrivalZone?: string;
 passengers?: number;
};

function normalizeInput(input: unknown): PartnerSuggestionInput {
 if (!input || typeof input !== "object") return {};

 const candidate = input as Record<string, unknown>;

 return {
  departureZone: typeof candidate.departureZone === "string" ? candidate.departureZone : undefined,
  arrivalZone: typeof candidate.arrivalZone === "string" ? candidate.arrivalZone : undefined,
  passengers: typeof candidate.passengers === "number" ? candidate.passengers : undefined
 };
}

function extractMaxCapacity(capacity: string) {
 const matches = capacity.match(/\d+/g);
 if (!matches?.length) return 0;
 return Number(matches[matches.length - 1]);
}

export async function runPartnerSuggestion(input: unknown) {
 const normalizedInput = normalizeInput(input);
 const zones = [normalizedInput.departureZone, normalizedInput.arrivalZone].filter(Boolean);
 const passengerCount = normalizedInput.passengers ?? 0;
 const rankedPartners = partners
  .map((partner) => {
   const zoneScore = zones.some((zone) =>
    partner.zones.some((partnerZone) => partnerZone.toLowerCase().includes(String(zone).toLowerCase()))
   )
    ? 20
    : 0;
   const capacityScore = passengerCount > 0 && extractMaxCapacity(partner.capacity) >= passengerCount ? 15 : 0;
   const statusPenalty = partner.status === "Indisponible" ? -50 : 0;

   return {
    partner,
    score: partner.internalScore + zoneScore + capacityScore + statusPenalty
   };
  })
  .sort((a, b) => b.score - a.score);

 const bestPartner = rankedPartners[0]?.partner ?? null;
 const output = {
  suggestion: bestPartner
   ? {
     partnerId: bestPartner.id,
     partnerName: bestPartner.name,
     status: bestPartner.status,
     score: bestPartner.internalScore
    }
   : null,
  reason:
   "Suggestion indicative pour aider la preselection commerciale. Validation humaine obligatoire avant tout engagement partenaire.",
  guardrails: {
   confirmsPartnerCommitment: false,
   createsReservation: false,
   requiresHumanValidation: true
  },
  input: normalizedInput
 };
 await logModelRun({
  purpose: "partner_suggestion",
  provider: "mock",
  model: "mock-partner-suggestion",
  input,
  output,
  status: "mock",
  latencyMs: 0,
  costEur: 0
 });
 return output;
}
