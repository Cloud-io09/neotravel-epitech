export type ChatApiStatus =
  | "INCOMPLETE"
  | "HUMAN_REVIEW"
  | "QUOTE_READY"
  | "QUALIFIED"
  | "ERROR";

export type QuoteBreakdownData = {
  distance?: {
    distanceKm: number;
    source?: string;
    pricingMode: "forfait_grid" | "long_distance_formula";
    gridCeilingKm?: number;
    oneWayBaseEur: number;
  };
  trip?: {
    type: string;
    multiplier: 1 | 2;
    baseAfterTripTypeEur: number;
  };
  coefficients?: {
    seasonality: number;
    leadTime: number;
    capacity: number;
    total: number;
    amountEur: number;
  };
  options?: {
    tollPackageEur: number;
    totalEur: number;
  };
  margin?: {
    rate: number;
    amountEur: number;
  };
  vat?: {
    rate: number;
    amountEur: number;
  };
  totals?: {
    beforeMarginEur: number;
    priceHtEur: number;
    priceTtcEur: number;
  };
};

export type QuoteSummary = {
  quoteNumber: string;
  vehicleCode: string;
  distanceKm: number;
  priceHt: number;
  vatAmount: number;
  priceTtc: number;
  departureCity?: string;
  arrivalCity?: string;
  departureDate?: string;
  passengerCount?: number;
  breakdown?: QuoteBreakdownData;
};

export type ChatApiResponse = {
  status: ChatApiStatus;
  message: string;
  leadId?: string;
  quoteId?: string;
  missingFields?: string[];
  reviewReason?: string;
  quote?: QuoteSummary;
};

export function chatJson(response: ChatApiResponse, init?: ResponseInit): Response {
  return Response.json(response, init);
}
