import { isLostQuote, isWonQuote } from "@/features/dashboard/services/quoteOutcome";
import { listFollowups, listLeads, listQuotes } from "@/shared/lib/data";
import type { Lead } from "@/shared/types/lead";
import type { Quote } from "@/shared/types/quote";

export type KpiTone = "blue" | "gold" | "red" | "green";

export type KpiMetric = {
  label: string;
  value: string | number;
  detail?: string;
  tone: KpiTone;
  href?: string;
};

export type ConversionBucket = {
  key: string;
  label: string;
  sent: number;
  accepted: number;
  rate: number;
};

export type KpisDashboardData = {
  hero: KpiMetric[];
  demandes: KpiMetric[];
  devis: KpiMetric[];
  relances: KpiMetric[];
  funnel: Array<{ label: string; value: number; tone: KpiTone }>;
  analyse: {
    aiManagedRate: string;
    aiManagedLeads: number;
    humanManagedLeads: number;
    blockedLeads: number;
    newLeads: number;
    handledLeads: number;
    conversionEvolution: ConversionBucket[];
  };
};

function dateTime(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "Non disponible";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
}

function percent(part: number, total: number) {
  return total > 0 ? `${Math.round((part / total) * 100)}%` : "0%";
}

function percentNumber(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function averageLeadToQuoteMinutes(leads: Lead[], quotes: Quote[]) {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const durations = quotes
    .map((quote) => {
      const lead = leadById.get(quote.leadId);
      const leadCreatedAt = dateTime(lead?.createdAt);
      const quoteCreatedAt =
        dateTime(quote.createdAt) ??
        dateTime(quote.updatedAt) ??
        dateTime(lead?.qualifiedAt) ??
        dateTime(lead?.updatedAt);
      if (leadCreatedAt === null || quoteCreatedAt === null || quoteCreatedAt < leadCreatedAt) return null;
      return (quoteCreatedAt - leadCreatedAt) / 60_000;
    })
    .filter((value): value is number => value !== null);

  if (durations.length === 0) return null;
  return durations.reduce((sum, value) => sum + value, 0) / durations.length;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(new Date(year, month - 1, 1));
}

function buildConversionEvolution(quotes: Quote[], leadById: Map<string, Lead>): ConversionBucket[] {
  const now = new Date();
  const buckets = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), index, 1);
    return { key: monthKey(date), sent: 0, accepted: 0 };
  });
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const quote of quotes) {
    const lead = leadById.get(quote.leadId);
    const commercialEventTime =
      (quote.status === "ACCEPTED" || quote.status === "REFUSED" || quote.status === "CLOSED"
        ? dateTime(quote.updatedAt) ?? dateTime(lead?.updatedAt)
        : dateTime(quote.updatedAt)) ??
      dateTime(quote.createdAt) ??
      dateTime(lead?.qualifiedAt) ??
      now.getTime();
    const quoteDate = new Date(commercialEventTime);
    const bucket = bucketByKey.get(monthKey(quoteDate));
    if (!bucket) continue;

    if (quote.status === "QUOTE_SENT" || isWonQuote(quote, lead) || isLostQuote(quote, lead)) {
      bucket.sent += 1;
    }
    if (isWonQuote(quote, lead)) {
      bucket.accepted += 1;
    }
  }

  return buckets.map((bucket) => ({
    ...bucket,
    label: monthLabel(bucket.key),
    rate: bucket.sent > 0 ? Math.round((bucket.accepted / bucket.sent) * 100) : 0
  }));
}

export async function getKpisDashboardData(): Promise<KpisDashboardData> {
  const [leads, quotes, followups] = await Promise.all([listLeads(), listQuotes(), listFollowups()]);
  const now = Date.now();
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  const generatedQuotes = quotes.length;
  const sentQuotes = quotes.filter((quote) => {
    const lead = leadById.get(quote.leadId);
    return quote.status === "QUOTE_SENT" || isWonQuote(quote, lead) || isLostQuote(quote, lead);
  }).length;
  const acceptedQuotes = quotes.filter((quote) => isWonQuote(quote, leadById.get(quote.leadId))).length;
  const refusedOrLostQuotes = quotes.filter((quote) => isLostQuote(quote, leadById.get(quote.leadId))).length;
  const incompleteLeads = leads.filter(
    (lead) => lead.status === "INCOMPLETE" || (lead.missingFields?.length ?? 0) > 0
  ).length;
  const humanReviewLeads = leads.filter((lead) => lead.status === "HUMAN_REVIEW").length;
  const urgentLeads = leads.filter((lead) => {
    const departureTime = dateTime(lead.departureDate);
    if (departureTime === null) return false;
    const hoursToDeparture = (departureTime - now) / 3_600_000;
    return hoursToDeparture >= 0 && hoursToDeparture < 7 * 24;
  }).length;
  const scheduledFollowups = followups.filter((followup) => followup.status === "SCHEDULED");
  const overdueFollowups = scheduledFollowups.filter((followup) => dateTime(followup.dueAt)! < now);
  const averageDelay = averageLeadToQuoteMinutes(leads, quotes);
  const conversionRate = percent(acceptedQuotes, sentQuotes);
  const conversionNumeric = percentNumber(acceptedQuotes, sentQuotes);

  const humanManagedLeads = humanReviewLeads;
  const blockedLeads = incompleteLeads;
  const newLeads = leads.filter((lead) => lead.status === "NEW").length;
  const automaticLeadStatuses = new Set<Lead["status"]>([
    "QUOTE_READY",
    "QUOTE_SENT",
    "FOLLOWUP_1",
    "FOLLOWUP_2",
    "FOLLOWUP_SCHEDULED",
    "WON"
  ]);
  const aiManagedLeads = leads.filter((lead) => {
    if (automaticLeadStatuses.has(lead.status)) return true;
    if (lead.status === "LOST" || lead.status === "CLOSED") {
      return quotes.some((quote) => quote.leadId === lead.id);
    }
    return false;
  }).length;
  const handledLeads = aiManagedLeads + humanManagedLeads;

  return {
    hero: [
      {
        label: "Demandes urgentes",
        value: urgentLeads,
        detail: "Départ sous 7 jours",
        tone: urgentLeads > 0 ? "red" : "green",
        href: "/dashboard/demandes?status=urgent"
      },
      {
        label: "À valider",
        value: humanReviewLeads,
        detail: "Validation humaine requise",
        tone: humanReviewLeads > 0 ? "gold" : "green",
        href: "/dashboard/human-review"
      },
      {
        label: "Conversion devis",
        value: conversionRate,
        detail: `${acceptedQuotes} acceptés / ${sentQuotes} envoyés`,
        tone: conversionNumeric >= 30 ? "green" : "blue",
        href: "/dashboard/devis"
      },
      {
        label: "Relances en retard",
        value: overdueFollowups.length,
        detail: "Action commerciale immédiate",
        tone: overdueFollowups.length > 0 ? "red" : "green",
        href: "/dashboard/relances?status=overdue"
      }
    ],
    demandes: [
      { label: "Demandes reçues", value: leads.length, tone: "blue", href: "/dashboard/demandes" },
      {
        label: "Urgentes (< 7 j)",
        value: urgentLeads,
        tone: urgentLeads > 0 ? "red" : "green",
        href: "/dashboard/demandes?status=urgent"
      },
      {
        label: "Incomplètes",
        value: incompleteLeads,
        tone: incompleteLeads > 0 ? "gold" : "green",
        href: "/dashboard/demandes?status=incomplete"
      },
      {
        label: "À valider",
        value: humanReviewLeads,
        tone: humanReviewLeads > 0 ? "gold" : "green",
        href: "/dashboard/human-review"
      },
      { label: "Nouvelles", value: newLeads, tone: "blue", href: "/dashboard/demandes" }
    ],
    devis: [
      { label: "Devis générés", value: generatedQuotes, tone: "blue", href: "/dashboard/devis" },
      { label: "Devis envoyés", value: sentQuotes, tone: "blue", href: "/dashboard/devis?status=sent" },
      {
        label: "Devis acceptés",
        value: acceptedQuotes,
        tone: "green",
        href: "/dashboard/devis?status=accepted"
      },
      {
        label: "Refusés / perdus",
        value: refusedOrLostQuotes,
        tone: refusedOrLostQuotes > 0 ? "red" : "green",
        href: "/dashboard/devis?status=lost"
      },
      { label: "Taux de conversion", value: conversionRate, tone: "green" },
      {
        label: "Délai moyen lead → devis",
        value: formatMinutes(averageDelay),
        tone: "blue"
      }
    ],
    relances: [
      {
        label: "Relances planifiées",
        value: scheduledFollowups.length,
        tone: "gold",
        href: "/dashboard/relances?status=scheduled"
      },
      {
        label: "Relances en retard",
        value: overdueFollowups.length,
        tone: overdueFollowups.length > 0 ? "red" : "green",
        href: "/dashboard/relances?status=overdue"
      },
      {
        label: "Relances envoyées",
        value: followups.filter((f) => f.status !== "SCHEDULED").length,
        tone: "blue",
        href: "/dashboard/relances"
      }
    ],
    funnel: [
      { label: "Demandes reçues", value: leads.length, tone: "blue" },
      { label: "Devis générés", value: generatedQuotes, tone: "blue" },
      { label: "Devis envoyés", value: sentQuotes, tone: "gold" },
      { label: "Devis acceptés", value: acceptedQuotes, tone: "green" }
    ],
    analyse: {
      aiManagedRate: percent(aiManagedLeads, handledLeads),
      aiManagedLeads,
      humanManagedLeads,
      blockedLeads,
      newLeads,
      handledLeads,
      conversionEvolution: buildConversionEvolution(quotes, leadById)
    }
  };
}
