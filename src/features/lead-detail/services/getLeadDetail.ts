import { mockLeads } from "@/data/mock-leads";
import { getLeadById } from "@/shared/lib/data/leadRepository";

export async function getLeadDetail(leadId: string) {
 // Passe par le repository (demo store / Supabase) pour refléter les
 // modifications faites depuis le dashboard, avec repli sur les mocks clients.
 return (await getLeadById(leadId)) ?? mockLeads.find((lead) => lead.id === leadId) ?? null;
}
