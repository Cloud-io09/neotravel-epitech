export type PricingOption = {
  code: string;
  label?: string;
  amountEur?: number;
};

export type PricingInput = {
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  requestDate?: string;
  passengerCount: number;
  options: PricingOption[];
  controlledDistanceKm?: number;
  now?: Date;
};

export type PricingResult = {
  quoteNumber: string;
  basePriceEur: number;
  basePriceSource: "route_pricing" | "controlled_distance";
  vehicleCode: string;
  priceHt: number;
  vatRate: number;
  priceTtc: number;
  breakdown: {
    routeLabel: string;
    matrixVersion: string;
    distanceKm: number;
    basePriceSource: "route_pricing" | "controlled_distance";
    vehicleCode: string;
    vehicleLabel: string;
    transferPricingMode: "flat_rate_under_180km" | "long_distance_over_180km";
    tariffKm?: number;
    formulaLabel: string;
    basePriceEur: number;
    options: Required<PricingOption>[];
    optionsTotal: number;
    subtotal: number;
    seasonCoeff: number;
    urgencyCoeff: number;
    capacityCoeff: number;
    coeffMultiplier: number;
    afterCoeff: number;
    margin: number;
    vatAmount: number;
  };
  deterministicHash: string;
};
