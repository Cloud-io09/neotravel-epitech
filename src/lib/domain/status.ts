export const LEAD_STATUSES = [
  "NEW",
  "INCOMPLETE",
  "QUALIFIED",
  "HIGH_VALUE",
  "HUMAN_REVIEW",
  "QUOTE_READY",
  "QUOTE_SENT",
  "FOLLOWUP_SCHEDULED",
  "FOLLOWUP_1",
  "FOLLOWUP_2",
  "FOLLOWUP_3",
  "WON",
  "LOST",
  "CLOSED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];
