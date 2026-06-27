import { auditActions, createAuditLog } from "@/shared/lib/audit";
import { createFollowupRecord } from "@/shared/lib/data/followupRepository";

const DAY_MS = 24 * 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export type ScheduleFollowupsInput = {
 leadId: string;
 quoteId?: string;
 quoteStatus?: "QUOTE_SENT";
 isUrgent?: boolean;
 highValue?: boolean;
 now?: string | Date;
};

export function getFollowupDelays(input: Pick<ScheduleFollowupsInput, "isUrgent">) {
 if (process.env.DEMO_FAST_FOLLOWUP === "true") {
  return [{ label: "DEMO_FAST_FOLLOWUP", delayMs: 2 * MINUTE_MS }];
 }

 if (input.isUrgent) {
  return [{ label: "URGENT_J2", delayMs: 2 * DAY_MS }];
 }

 return [
  { label: "STANDARD_J3", delayMs: 3 * DAY_MS },
  { label: "STANDARD_J7", delayMs: 7 * DAY_MS }
 ];
}

export function resolvePostFollowupOutcome(input: { sentFollowupsWithoutResponse: number; highValue?: boolean }) {
 if (input.sentFollowupsWithoutResponse < 2) return "PENDING";
 return input.highValue ? "HUMAN_REVIEW" : "CLOSED";
}

export async function scheduleFollowups(input: ScheduleFollowupsInput) {
 const sourceDate = input.now ? new Date(input.now) : new Date();
 const delays = getFollowupDelays(input).slice(0, 2);

 const followups = await Promise.all(
  delays.map((delay) =>
   createFollowupRecord({
    leadId: input.leadId,
    quoteId: input.quoteId,
    channel: "email",
    dueAt: new Date(sourceDate.getTime() + delay.delayMs).toISOString()
   })
  )
 );

 await Promise.all(
  followups.map((followup, index) =>
   createAuditLog({
    entityType: "followup",
    entityId: followup.id,
    action: auditActions.followupScheduled,
    actor: "system",
    input,
    output: followup,
    payload: {
     leadId: followup.leadId,
     quoteId: followup.quoteId,
     channel: followup.channel,
     dueAt: followup.dueAt,
     rule: delays[index]?.label,
     quoteStatus: input.quoteStatus ?? "QUOTE_SENT"
    }
   })
  )
 );

 return {
  leadId: input.leadId,
  quoteId: input.quoteId,
  quoteStatus: input.quoteStatus ?? "QUOTE_SENT",
  ruleSet: process.env.DEMO_FAST_FOLLOWUP === "true" ? "demo_fast" : input.isUrgent ? "urgent" : "standard",
  nextOutcomeAfterTwoNoResponse: resolvePostFollowupOutcome({
   sentFollowupsWithoutResponse: 2,
   highValue: input.highValue
  }),
  followups
 };
}
