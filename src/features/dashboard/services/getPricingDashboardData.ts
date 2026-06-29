import type { PricingRules } from "@/lib/domain/types";
import {
  getPricingStorageMode,
  loadActivePricingRules,
  type PricingStorageMode
} from "@/lib/pricing/pricing-matrix-store";

export type PricingTone = "blue" | "gold" | "red" | "green";

export type PricingHeroMetric = {
  label: string;
  value: string | number;
  detail?: string;
  tone: PricingTone;
};

export type PricingDashboardData = {
  hero: PricingHeroMetric[];
  summary: {
    version: string;
    storageLabel: string;
    storageDetail: string;
    isSupabase: boolean;
    gridTiers: number;
    maxGridKm: number;
    maxGridPrice: number;
    longDistanceRate: number;
    marginPercent: string;
    vatPercent: string;
    guideDayRate: number;
    driverNightRate: number;
  };
  rules: PricingRules;
  storageMode: PricingStorageMode;
};

function rateToPercent(rate: number) {
  return `${Math.round(rate * 1000) / 10} %`;
}

function storageLabels(mode: PricingStorageMode) {
  if (mode === "supabase") {
    return { label: "Supabase", detail: "Table pricing_matrices", tone: "green" as const };
  }
  if (mode === "file") {
    return { label: "Fichier local", detail: "pricing-matrix.json", tone: "gold" as const };
  }
  return { label: "Défauts code", detail: "Enregistrez pour persister", tone: "gold" as const };
}

export async function getPricingDashboardData(): Promise<PricingDashboardData> {
  const [rules, storageMode] = await Promise.all([loadActivePricingRules(), getPricingStorageMode()]);
  const storage = storageLabels(storageMode);
  const lastTier = rules.forfaitDistanceGrid.at(-1);
  const maxGridKm = lastTier?.distanceKm ?? 0;
  const maxGridPrice = lastTier?.priceEur ?? 0;

  const hero: PricingHeroMetric[] = [
    {
      label: "Version matrice",
      value: rules.version,
      detail: `${rules.forfaitDistanceGrid.length} paliers distance`,
      tone: "blue"
    },
    {
      label: "Persistance",
      value: storage.label,
      detail: storage.detail,
      tone: storage.tone
    },
    {
      label: "Grille max",
      value: maxGridPrice > 0 ? `${maxGridPrice} €` : "—",
      detail: maxGridKm > 0 ? `Jusqu'à ${maxGridKm} km` : undefined,
      tone: "green"
    },
    {
      label: "Marge / TVA",
      value: `${rateToPercent(rules.marginRate)} / ${rateToPercent(rules.vatRate)}`,
      detail: `Longue distance : ${rules.longDistanceRatePerKmPerLeg} €/km`,
      tone: "gold"
    }
  ];

  return {
    hero,
    summary: {
      version: rules.version,
      storageLabel: storage.label,
      storageDetail: storage.detail,
      isSupabase: storageMode === "supabase",
      gridTiers: rules.forfaitDistanceGrid.length,
      maxGridKm,
      maxGridPrice,
      longDistanceRate: rules.longDistanceRatePerKmPerLeg,
      marginPercent: rateToPercent(rules.marginRate),
      vatPercent: rateToPercent(rules.vatRate),
      guideDayRate: rules.optionRates.guideDayRateEur,
      driverNightRate: rules.optionRates.driverNightRateEur
    },
    rules,
    storageMode
  };
}
