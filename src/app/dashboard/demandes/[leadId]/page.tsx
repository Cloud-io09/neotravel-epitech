import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import { getLeadTimeline } from "@/features/lead-detail/services/getLeadTimeline";
import { LeadJourney } from "@/features/lead-detail/components/LeadJourney";
import { HumanReviewActions } from "@/features/lead-detail/components/HumanReviewActions";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import styles from "@/features/lead-detail/components/leadDetail.module.css";

export const dynamic = "force-dynamic";

async function getLatestQuote(leadId: string): Promise<{ id: string; priceTtc: number | null } | null> {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("quotes")
    .select("id, price_ttc")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id as string, priceTtc: data.price_ttc != null ? Number(data.price_ttc) : null };
}

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;

  const lead = await getLeadDetail(leadId);
  if (!lead) {
    return (
      <main className={styles.page}>
        <Link className={styles.back} href="/dashboard">
          ← Pipeline
        </Link>
        <div className={styles.notFound}>
          <h1>Demande introuvable</h1>
          <p>Aucune demande ne correspond à cet identifiant.</p>
        </div>
      </main>
    );
  }

  const [timeline, quote] = await Promise.all([getLeadTimeline(leadId), getLatestQuote(leadId)]);

  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/dashboard">
        ← Pipeline
      </Link>

      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Demande {lead.id.slice(0, 8)}</p>
          <h1>{lead.organization ?? lead.email ?? "Prospect"}</h1>
        </div>
        <StatusBadge status={lead.status} />
      </header>

      {lead.status === "HUMAN_REVIEW" ? (
        <HumanReviewActions leadId={lead.id} humanReviewReason={lead.humanReviewReason} />
      ) : null}

      <LeadJourney
        lead={lead}
        timeline={timeline}
        quoteId={quote?.id ?? null}
        quoteAmountTtc={quote?.priceTtc ?? null}
      />
    </main>
  );
}
