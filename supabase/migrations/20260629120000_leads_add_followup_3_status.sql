-- 3-step relance sequence (J+1 / J+3 / J+7) needs a third follow-up status so a lead can be
-- tracked F1 → F2 → F3 → CLOSED. Adds FOLLOWUP_3 to the leads status constraint.

alter table leads drop constraint if exists leads_status_check;

alter table leads
  add constraint leads_status_check check (
    status in (
      'NEW',
      'INCOMPLETE',
      'QUALIFIED',
      'HIGH_VALUE',
      'HUMAN_REVIEW',
      'QUOTE_READY',
      'QUOTE_SENT',
      'FOLLOWUP_SCHEDULED',
      'FOLLOWUP_1',
      'FOLLOWUP_2',
      'FOLLOWUP_3',
      'WON',
      'LOST',
      'CLOSED'
    )
  );
