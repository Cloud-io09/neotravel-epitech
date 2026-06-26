export const VAT_RATE = 0.1;
export const DEFAULT_MARGIN_RATE = 0.15;
export const MAX_AUTOMATIC_PASSENGERS = 85;
export const URGENT_DEPARTURE_HOURS = 48;
export const PRICING_MATRIX_VERSION = "2026-06-kickoff";
export const PRICING_MATRICES_ACTIVE = true;

export const VEHICLE_LABELS = {
  MINIBUS: {
    label: "Minibus <= 19 passagers",
    maxPassengers: 19
  },
  COACH: {
    label: "Autocar 20-53 passagers",
    maxPassengers: 53
  },
  PREMIUM_COACH: {
    label: "Autocar grande capacite 54-85 passagers",
    maxPassengers: 85
  }
} as const;

export const TRANSFER_SIMPLE_FLAT_RATES = {
  10: 250,
  20: 250,
  30: 250,
  40: 320,
  50: 350,
  60: 390,
  70: 430,
  80: 500,
  90: 540,
  100: 580,
  110: 620,
  120: 660,
  130: 700,
  140: 740,
  150: 780,
  160: 820,
  170: 860,
  180: 900
} as const;

export const TRANSFER_SIMPLE_FLAT_RATE_MAX_KM = 180;
export const TRANSFER_SIMPLE_LONG_DISTANCE_RATE_EUR = 2.5;
export const TRANSFER_SIMPLE_LONG_DISTANCE_MULTIPLIER = 2;

export const OFFICIAL_OPTION_PRICING = {
  guide: { label: "Guide / accompagnateur", amountEur: 80 },
  nuit_chauffeur: { label: "Nuit chauffeur", amountEur: 120 },
  peages: { label: "Peages estimes", amountEur: 120 }
} as const;
