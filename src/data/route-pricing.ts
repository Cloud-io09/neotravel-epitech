export type DemoRoutePricing = {
  distanceKm: number;
  demoBasePriceEur: number;
};

export const routePricing: Record<string, DemoRoutePricing> = {
  "paris__lyon": { distanceKm: 465, demoBasePriceEur: 2450 },
  "paris__lille": { distanceKm: 225, demoBasePriceEur: 1350 },
  "lyon__marseille": { distanceKm: 315, demoBasePriceEur: 1750 },
  "nantes__bordeaux": { distanceKm: 345, demoBasePriceEur: 1950 },
  "toulouse__montpellier": { distanceKm: 245, demoBasePriceEur: 1450 }
};
