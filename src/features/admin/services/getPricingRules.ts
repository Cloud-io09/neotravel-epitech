import { listPricingRules, listRoutePricing } from "@/shared/lib/data/pricingRepository";

export async function getPricingAdminData() {
 const [pricingRules, routePricing] = await Promise.all([listPricingRules(), listRoutePricing()]);

 return {
  pricingRules,
  routePricing
 };
}
