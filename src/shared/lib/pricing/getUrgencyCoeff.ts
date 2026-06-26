import { URGENT_DEPARTURE_HOURS } from "./pricing.constants";

export function getUrgencyCoeff(date: string, now = new Date()) {
  const departure = new Date(date);
  const diffHours = (departure.getTime() - now.getTime()) / 36e5;
  const diffDays = diffHours / 24;

  if (diffHours > 0 && diffHours < URGENT_DEPARTURE_HOURS) return 0.1;
  if (diffDays <= 7) return 0.1;
  if (diffDays <= 30) return 0.05;
  if (diffDays < 90) return -0.05;
  return -0.1;
}
