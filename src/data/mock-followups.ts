import type { Followup } from "@/shared/types/followup";

export const mockFollowups: Followup[] = [
  {
    id: "demo-followup-alpha-j3",
    leadId: "demo-lead-alpha",
    quoteId: "demo-quote-alpha",
    channel: "email",
    status: "SCHEDULED",
    dueAt: "2026-06-27T09:00:00.000Z"
  },
  {
    id: "demo-followup-alpha-j7",
    leadId: "demo-lead-alpha",
    quoteId: "demo-quote-alpha",
    channel: "email",
    status: "SCHEDULED",
    dueAt: "2026-07-01T09:00:00.000Z"
  },
  {
    id: "demo-followup-urgent-j2",
    leadId: "demo-lead-urgent-treatable",
    quoteId: "demo-quote-urgent",
    channel: "email",
    status: "SCHEDULED",
    dueAt: "2026-06-26T09:00:00.000Z"
  },
  {
    id: "demo-followup-no-response-j3",
    leadId: "demo-lead-no-response",
    quoteId: "demo-quote-no-response",
    channel: "email",
    status: "SENT",
    dueAt: "2026-06-27T09:00:00.000Z"
  },
  {
    id: "demo-followup-no-response-j7",
    leadId: "demo-lead-no-response",
    quoteId: "demo-quote-no-response",
    channel: "email",
    status: "SENT",
    dueAt: "2026-07-01T09:00:00.000Z"
  }
];
