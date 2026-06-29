import Link from "next/link";
import { LeadDetailClient } from "@/features/lead-detail/components/LeadDetailClient";
import { buildLeadDetailPageData } from "@/features/lead-detail/services/getLeadDetailPageData";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import styles from "@/features/lead-detail/components/leadDetailDashboard.module.css";
import { requirePermission } from "@/shared/lib/auth/requireAdmin";
import { listFollowups, listQuotes } from "@/shared/lib/data";
import { latestQuoteByLeadId, nextScheduledFollowup } from "@/features/dashboard/services/leadPipelinePresentation";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  await requirePermission("leads");
  const { leadId } = await params;
  const [lead, quotes, followups] = await Promise.all([getLeadDetail(leadId), listQuotes(), listFollowups()]);

  if (!lead) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>Demande introuvable</h1>
          <p>Aucune demande ne correspond à cet identifiant.</p>
          <Link className={styles.backLink} href="/dashboard/demandes">
            Retour aux demandes
          </Link>
        </section>
      </main>
    );
  }

  const quote = latestQuoteByLeadId(quotes).get(lead.id);
  const followup = nextScheduledFollowup(lead.id, followups);
  const data = buildLeadDetailPageData({ lead, quote, followup });

  return <LeadDetailClient lead={lead} quote={quote} followup={followup} data={data} />;
}
