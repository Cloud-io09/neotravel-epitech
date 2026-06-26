import { AuditLogTable } from "@/features/admin/components/AuditLogTable";
import { ModelRunTable } from "@/features/admin/components/ModelRunTable";
import styles from "@/features/admin/components/adminAudit.module.css";
import { getAuditLogs } from "@/features/admin/services/getAuditLogs";
import { getModelRuns } from "@/features/admin/services/getModelRuns";

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ entityType?: string; action?: string; actor?: string; dateFrom?: string; dateTo?: string }>;
}) {
  const filters = await searchParams;
  const [logs, modelRuns] = await Promise.all([getAuditLogs(filters), getModelRuns()]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Admin audit</h1>
          <p>
            Preuve de tracabilite du MVP : actions metier, hashes, payloads nettoyes et runs IA ou mock. Les secrets ne
            sont jamais affiches en clair.
          </p>
        </div>
        <span className={styles.badge}>Tracabilite soutenance</span>
      </header>

      <form className={styles.filters}>
        <label>
          Entity type
          <select name="entityType" defaultValue={filters.entityType ?? ""}>
            <option value="">Tous</option>
            <option value="lead">lead</option>
            <option value="quote">quote</option>
            <option value="followup">followup</option>
            <option value="human_review">human_review</option>
            <option value="model_run">model_run</option>
            <option value="pricing_rule">pricing_rule</option>
          </select>
        </label>
        <label>
          Action
          <input name="action" defaultValue={filters.action ?? ""} placeholder="quote.generated" />
        </label>
        <label>
          Actor
          <select name="actor" defaultValue={filters.actor ?? ""}>
            <option value="">Tous</option>
            <option value="user">user</option>
            <option value="ai">ai</option>
            <option value="system">system</option>
            <option value="human">human</option>
            <option value="commercial">commercial</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label>
          Du
          <input name="dateFrom" type="date" defaultValue={filters.dateFrom ?? ""} />
        </label>
        <label>
          Au
          <input name="dateTo" type="date" defaultValue={filters.dateTo ?? ""} />
        </label>
        <button type="submit">Filtrer</button>
      </form>

      <div className={styles.grid}>
        <AuditLogTable logs={logs} />
        <ModelRunTable runs={modelRuns} />
      </div>
    </main>
  );
}
