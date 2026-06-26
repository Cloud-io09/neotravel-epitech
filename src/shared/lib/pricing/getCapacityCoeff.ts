export function getCapacityCoeff(passengerCount: number) {
  if (passengerCount <= 19) return -0.05;
  if (passengerCount <= 53) return 0;
  if (passengerCount <= 63) return 0.15;
  if (passengerCount <= 67) return 0.2;
  return 0.4;
}
