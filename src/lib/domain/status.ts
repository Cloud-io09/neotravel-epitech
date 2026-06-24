export const LEAD_STATUSES = [
  "NEW",
  "INCOMPLETE",
  "QUALIFIED",
  "HUMAN_REVIEW",
  "QUOTE_READY",
  "QUOTE_SENT",
  "FOLLOWUP_SCHEDULED",
  "WON",
  "LOST",
  "CLOSED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
