import { routePricing } from "@/data/route-pricing";
import { isPromptInjection } from "@/shared/lib/ai/guardrails";
import { MAX_AUTOMATIC_PASSENGERS, URGENT_DEPARTURE_HOURS } from "@/shared/lib/pricing/pricing.constants";
import type { DemandDraft } from "@/shared/types/lead";

export type HumanReviewReason =
 | "PASSENGER_COUNT_ABOVE_AUTOMATIC_LIMIT"
 | "DEPARTURE_LESS_THAN_48H"
 | "UNKNOWN_ROUTE_WITHOUT_CONTROLLED_DISTANCE"
 | "LOW_AI_CONFIDENCE"
 | "PROMPT_INJECTION"
 | "INCOHERENT_DEMAND"
 | "OUT_OF_SCOPE_MVP"
 | "DISCOUNT_OR_FORCED_PRICE_REQUEST"
 | "REAL_PARTNER_AVAILABILITY_REQUEST"
 | "PRICING_MATRICES_UNAVAILABLE"
 | "QUOTE_CHANGE_REQUEST";

export type HumanReviewEvaluation = {
 escalate: boolean;
 reasons: HumanReviewReason[];
};

type HumanReviewDemand = DemandDraft & {
 confidence?: number | null;
 controlledDistanceKm?: number | null;
 pricingMatricesActive?: boolean | null;
};

function normalizeCity(city: string) {
 return city.trim().toLowerCase();
}

function hasKnownRoute(departureCity: string, arrivalCity: string) {
 const key = `${normalizeCity(departureCity)}__${normalizeCity(arrivalCity)}`;
 const reverseKey = `${normalizeCity(arrivalCity)}__${normalizeCity(departureCity)}`;
 return Boolean(routePricing[key] ?? routePricing[reverseKey]);
}

function addReason(reasons: HumanReviewReason[], reason: HumanReviewReason) {
 if (!reasons.includes(reason)) reasons.push(reason);
}

export function evaluateHumanReview(demand: HumanReviewDemand): HumanReviewEvaluation {
 const reasons: HumanReviewReason[] = [];
 const rawMessage = demand.rawMessage ?? "";

 if (demand.passengerCount !== null && demand.passengerCount > MAX_AUTOMATIC_PASSENGERS) {
  addReason(reasons, "PASSENGER_COUNT_ABOVE_AUTOMATIC_LIMIT");
 }

 if (demand.departureDate) {
  const departure = new Date(demand.departureDate);
  const diffHours = (departure.getTime() - Date.now()) / 36e5;
  if (diffHours >= 0 && diffHours < URGENT_DEPARTURE_HOURS) {
   addReason(reasons, "DEPARTURE_LESS_THAN_48H");
  }
 }

 if (
  demand.departureCity &&
  demand.arrivalCity &&
  !demand.controlledDistanceKm &&
  !hasKnownRoute(demand.departureCity, demand.arrivalCity)
 ) {
  addReason(reasons, "UNKNOWN_ROUTE_WITHOUT_CONTROLLED_DISTANCE");
 }

 if (typeof demand.confidence === "number" && demand.confidence < 0.8) {
  addReason(reasons, "LOW_AI_CONFIDENCE");
 }

 if (demand.pricingMatricesActive === false) {
  addReason(reasons, "PRICING_MATRICES_UNAVAILABLE");
 }

 if (rawMessage && isPromptInjection(rawMessage)) {
  addReason(reasons, "PROMPT_INJECTION");
 }

 if (/incoherent|incoh[eé]rent|date impossible|ville inconnue|trajet impossible/i.test(rawMessage)) {
  addReason(reasons, "INCOHERENT_DEMAND");
 }

 if (
  /hors cadre|hors perimetre|hors p[eé]rim[eè]tre|sur mesure|transport medical|transport m[eé]dical|marchandises|mati[eè]res dangereuses/i.test(
   rawMessage
  )
 ) {
  addReason(reasons, "OUT_OF_SCOPE_MVP");
 }

 if (/remise|rabais|discount|prix impos[eé]|prix fixe|50%|moiti[eé] prix|gratuit/i.test(rawMessage)) {
  addReason(reasons, "DISCOUNT_OR_FORCED_PRICE_REQUEST");
 }

 if (
  /disponibilit[eé] r[eé]elle|disponible maintenant|confirme.*autocar|r[eé]server.*autocar|autocariste confirm[eé]|partenaire confirm[eé]/i.test(
   rawMessage
  )
 ) {
  addReason(reasons, "REAL_PARTNER_AVAILABILITY_REQUEST");
 }

 return {
  escalate: reasons.length > 0,
  reasons
 };
}

export function shouldEscalate(demand: HumanReviewDemand) {
 return evaluateHumanReview(demand).escalate;
}
