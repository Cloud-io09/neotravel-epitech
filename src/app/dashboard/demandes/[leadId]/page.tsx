import { LeadHeader } from "@/features/lead-detail/components/LeadHeader";
import { LeadMessages } from "@/features/lead-detail/components/LeadMessages";
import { LeadQuotePanel } from "@/features/lead-detail/components/LeadQuotePanel";
import { LeadHistory } from "@/features/lead-detail/components/LeadHistory";
import { HumanReviewActions } from "@/features/lead-detail/components/HumanReviewActions";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import styles from "@/features/lead-detail/components/lead-detail.module.css";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const lead = await getLeadDetail(leadId);

  if (!lead) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>Demande introuvable</h1>
          <p>Aucune demande ne correspond a cet identifiant.</p>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <LeadHeader lead={lead} />
      {lead.status === "HUMAN_REVIEW" && (
        <HumanReviewActions leadId={lead.id} humanReviewReason={lead.humanReviewReason} />
      )}
      <div className={styles.grid}>
        <LeadMessages lead={lead} />
        <div className={styles.sideStack}>
          <LeadQuotePanel lead={lead} />
          <LeadHistory lead={lead} />
        </div>
      </div>
    </main>
  );
}
