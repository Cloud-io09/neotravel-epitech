export type VehicleCode = "MINIBUS" | "COACH" | "PREMIUM_COACH" | "INVALID";

export function getVehicleCode(passengerCount: number): VehicleCode {
  if (passengerCount <= 0) return "INVALID";
  if (passengerCount <= 19) return "MINIBUS";
  if (passengerCount <= 53) return "COACH";
  return "PREMIUM_COACH";
}
