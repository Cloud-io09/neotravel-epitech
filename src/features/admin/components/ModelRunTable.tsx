import type { ModelRun } from "@/shared/types/model-run";
import styles from "./adminAudit.module.css";

function formatDate(value: string) {
 return new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short"
 }).format(new Date(value));
}

function shortHash(value?: string) {
 return value ? `${value.slice(0, 10)}...` : "non renseigne";
}

export function ModelRunTable({ runs }: { runs: ModelRun[] }) {
 return (
  <section className={styles.panel} aria-labelledby="model-runs-title">
   <div className={styles.panelHeader}>
    <h2 id="model-runs-title">model_runs</h2>
    <p>Suivi cout, latence et statut des appels IA ou mock.</p>
   </div>
   <div className={styles.runTable}>
    <div className={styles.runHead}>
     <span>Usage</span>
     <span>Provider</span>
     <span>Statut</span>
     <span>Hash input</span>
     <span>Date</span>
    </div>
    {runs.map((run) => (
     <div className={styles.runRow} key={run.id}>
      <span>
       <strong>{run.purpose}</strong>
       <small>{run.model}</small>
      </span>
      <span>{run.provider ?? "mock"}</span>
      <span className={styles.status}>{run.status ?? "success"}</span>
      <code>{shortHash(run.payloadHash)}</code>
      <span>{formatDate(run.createdAt)}</span>
     </div>
    ))}
   </div>
  </section>
 );
}
