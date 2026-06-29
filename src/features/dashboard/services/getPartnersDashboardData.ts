import { partners } from "@/features/partners/components/partnerData";
import type { AlphaMetric } from "@/features/dashboard/components/AlphaDashboardLayout";

export type PartnersDashboardData = {
  hero: AlphaMetric[];
  summary: Array<{ label: string; value: string; tone?: "green" | "gold" | "red" }>;
  partners: Array<{
    id: string;
    name: string;
    zones: string;
    capacity: string;
    status: string;
    score: number;
  }>;
};

export function getPartnersDashboardData(): PartnersDashboardData {
  const confirmed = partners.filter((p) => p.status === "Confirme par commercial").length;
  const pending = partners.filter((p) => p.status === "A confirmer" || p.status === "Option posee").length;
  const unavailable = partners.filter((p) => p.status === "Indisponible").length;
  const avgScore = Math.round(partners.reduce((sum, p) => sum + p.internalScore, 0) / partners.length);

  return {
    hero: [
      { label: "Partenaires", value: partners.length, detail: "Réseau référencé", tone: "blue" },
      { label: "Confirmés", value: confirmed, detail: "Validation commerciale", tone: "green" },
      { label: "À confirmer", value: pending, detail: "Options ou vérification", tone: pending > 0 ? "gold" : "green" },
      { label: "Score moyen", value: avgScore, detail: "Indice interne / 100", tone: avgScore >= 80 ? "green" : "blue" }
    ],
    summary: [
      { label: "Confirmés", value: String(confirmed), tone: "green" },
      { label: "En cours", value: String(pending), tone: "gold" },
      { label: "Indisponibles", value: String(unavailable), tone: unavailable > 0 ? "red" : "green" },
      { label: "Zones couvertes", value: String(new Set(partners.flatMap((p) => p.zones)).size) }
    ],
    partners: partners.map((partner) => ({
      id: partner.id,
      name: partner.name,
      zones: partner.zones.join(", "),
      capacity: partner.capacity,
      status: partner.status,
      score: partner.internalScore
    }))
  };
}
