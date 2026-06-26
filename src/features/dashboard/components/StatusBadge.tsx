import styles from "./dashboard.module.css";

type Tone = "new" | "info" | "warning" | "danger" | "success" | "priority" | "muted";

// Maps every lead/quote/followup status to a French label and a tone (CSS data-tone).
const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  // Lead lifecycle
  NEW: { label: "Nouveau", tone: "new" },
  INCOMPLETE: { label: "À compléter", tone: "warning" },
  QUALIFIED: { label: "Qualifié", tone: "info" },
  HIGH_VALUE: { label: "Fort enjeu", tone: "priority" },
  HUMAN_REVIEW: { label: "À valider", tone: "danger" },
  QUOTE_READY: { label: "Devis prêt", tone: "info" },
  QUOTE_SENT: { label: "Devis envoyé", tone: "info" },
  FOLLOWUP_1: { label: "Relance 1", tone: "warning" },
  FOLLOWUP_2: { label: "Relance 2", tone: "warning" },
  FOLLOWUP_SCHEDULED: { label: "Relance prévue", tone: "warning" },
  WON: { label: "Gagné", tone: "success" },
  LOST: { label: "Perdu", tone: "muted" },
  CLOSED: { label: "Clôturé", tone: "muted" },
  // Quote outcome (demo fixtures)
  ACCEPTED: { label: "Accepté", tone: "success" },
  REFUSED: { label: "Refusé", tone: "muted" },
  // Followup status
  SCHEDULED: { label: "Programmée", tone: "warning" },
  SENT: { label: "Envoyée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "muted" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={styles.badge} data-tone={meta?.tone ?? "muted"}>
      {label ?? meta?.label ?? status}
    </span>
  );
}
