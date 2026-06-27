import { PIPELINE_STATUSES } from "../services/getPipelineData";
import styles from "./dashboard.module.css";
import { StatusBadge } from "./StatusBadge";

/**
 * Pipeline overview — one honest count per status, straight from Supabase.
 * Statuses with zero rows are shown as 0 (never hidden, never invented).
 */
export function PipelineOverview({
  statusCounts,
  total,
}: {
  statusCounts: Record<string, number>;
  total: number;
}) {
  return (
    <section className={styles.pipelineOverview} aria-label="Vue d'ensemble du pipeline">
      <article className={`${styles.pipelineCard} ${styles.pipelineTotal}`}>
        <strong>{total}</strong>
        <span>Leads au total</span>
      </article>
      {PIPELINE_STATUSES.map((status) => (
        <article className={styles.pipelineCard} key={status}>
          <strong>{statusCounts[status] ?? 0}</strong>
          <StatusBadge status={status} />
        </article>
      ))}
    </section>
  );
}
