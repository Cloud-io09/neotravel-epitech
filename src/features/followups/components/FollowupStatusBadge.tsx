import type { FollowupStatus } from "@/shared/types/followup";
import styles from "./followups.module.css";

export function FollowupStatusBadge({ status }: { status: FollowupStatus }) {
 return <span className={styles.status}>{status}</span>;
}
