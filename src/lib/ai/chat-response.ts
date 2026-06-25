export type ChatApiStatus =
  | "INCOMPLETE"
  | "HUMAN_REVIEW"
  | "QUOTE_READY"
  | "QUALIFIED"
  | "ERROR";

export type QuoteSummary = {
  quote_number: string;
  vehicle_code: string;
  distance_km: number;
  price_ht: number;
  vat_amount: number;
  price_ttc: number;
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
