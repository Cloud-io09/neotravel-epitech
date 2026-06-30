import type { PricingOption } from "@/shared/types/pricing";

type LegacyOptionItem = {
  code: string;
  label: string;
  amountEur?: number;
  note?: string;
  pricingStatus?: PricingOption["pricingStatus"];
};

type LegacyOptionsBreakdown = {
  items?: LegacyOptionItem[];
  tollPackageEur?: number;
};

type BreakdownLike = {
  options?: PricingOption[] | LegacyOptionsBreakdown | null;
};

function money(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toOptionLine(item: LegacyOptionItem): Required<PricingOption> {
  return {
    code: item.code,
    label: item.label,
    amountEur: money(item.amountEur),
    note: item.note ?? "",
    pricingStatus: item.pricingStatus ?? "TO_CONFIRM",
  };
}

export function getQuoteOptionLines(breakdown?: BreakdownLike | null): Required<PricingOption>[] {
  const options = breakdown?.options;
  if (!options) return [];

  if (Array.isArray(options)) {
    return options.map((item) =>
      toOptionLine({
        code: item.code,
        label: item.label ?? item.code,
        amountEur: item.amountEur,
        note: item.note,
        pricingStatus: item.pricingStatus,
      })
    );
  }

  if (options.items?.length) {
    return options.items.map(toOptionLine);
  }

  if (options.tollPackageEur) {
    return [
      toOptionLine({
        code: "tolls",
        label: "Péages",
        amountEur: money(options.tollPackageEur),
        pricingStatus: "PRICED",
        note: "Forfait péages contrôlé",
      }),
    ];
  }

  return [];
}
