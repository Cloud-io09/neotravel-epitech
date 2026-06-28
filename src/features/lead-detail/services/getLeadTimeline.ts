import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Real journey of a lead, built from audit_logs. Every backend transition writes
 * an audit event (LEAD_CREATED, QUOTE_CREATED, FOLLOWUP_SCHEDULED, …) keyed by the
 * entity it touched. We gather the events for the lead itself plus its quotes and
 * followups, ordered chronologically — no invented steps.
 */

export type JourneyEvent = {
  id: string;
  action: string;
  label: string;
  detail: string | null;
  entityType: string;
  at: string;
};

const ACTION_LABELS: Record<string, string> = {
  LEAD_CREATED: "Demande reçue",
  LEAD_UPDATED: "Informations mises à jour",
  LEAD_MARKED_INCOMPLETE: "Marquée incomplète",
  LEAD_MARKED_HUMAN_REVIEW: "Escaladée en validation humaine",
  LEAD_STATUS_UPDATED: "Statut mis à jour",
  HUMAN_REVIEW_RESOLVED: "Validation humaine tranchée",
  QUOTE_CREATED: "Devis calculé",
  QUOTE_GENERATED: "Devis calculé",
  QUOTE_SENT: "Devis envoyé",
  QUOTE_ACCEPTED: "Devis accepté",
  QUOTE_REFUSED: "Devis refusé",
  QUOTE_CHANGE_REQUESTED: "Modification de devis demandée",
  FOLLOWUP_SCHEDULED: "Relance programmée",
  FOLLOWUP_SENT: "Relance envoyée",
};

function labelFor(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function detailFor(action: string, metadata: Record<string, unknown>): string | null {
  switch (action) {
    case "LEAD_MARKED_INCOMPLETE": {
      const missing = metadata.missingFields;
      return Array.isArray(missing) && missing.length ? `Manque : ${missing.join(", ")}` : null;
    }
    case "LEAD_MARKED_HUMAN_REVIEW":
      return typeof metadata.reason === "string" ? metadata.reason : null;
    case "LEAD_STATUS_UPDATED":
      return typeof metadata.status === "string" ? metadata.status : null;
    case "HUMAN_REVIEW_RESOLVED":
      return typeof metadata.targetStatus === "string" ? `→ ${metadata.targetStatus}` : null;
    case "QUOTE_CREATED":
    case "QUOTE_GENERATED":
      return typeof metadata.quoteNumber === "string" ? metadata.quoteNumber : null;
    case "FOLLOWUP_SCHEDULED":
      return typeof metadata.dueAt === "string"
        ? `Échéance ${new Date(metadata.dueAt).toLocaleDateString("fr-FR")}`
        : typeof metadata.rule === "string"
          ? metadata.rule
          : null;
    default:
      return null;
  }
}

export async function getLeadTimeline(leadId: string): Promise<JourneyEvent[]> {
  const supabase = createServerSupabaseClient();

  // Related entity ids whose audit events belong to this lead's journey.
  const [{ data: quotes }, { data: followups }] = await Promise.all([
    supabase.from("quotes").select("id").eq("lead_id", leadId),
    supabase.from("followups").select("id").eq("lead_id", leadId),
  ]);

  const entityIds = [
    leadId,
    ...(quotes ?? []).map((q) => q.id as string),
    ...(followups ?? []).map((f) => f.id as string),
  ];

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, entity_type, entity_id, action, metadata, created_at")
    .in("entity_id", entityIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Unable to load lead timeline: ${error.message}`);

  return (data ?? []).map((log) => ({
    id: log.id,
    action: log.action,
    label: labelFor(log.action),
    detail: detailFor(log.action, (log.metadata ?? {}) as Record<string, unknown>),
    entityType: log.entity_type,
    at: log.created_at,
  }));
}
