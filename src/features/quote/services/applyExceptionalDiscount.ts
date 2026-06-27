export function applyExceptionalDiscount(totalAmount: number, discountAmount: number, reason: string) {
 if (!reason.trim()) {
  throw new Error("Un motif est obligatoire pour une remise exceptionnelle.");
 }

 return Math.max(0, totalAmount - discountAmount);
}
