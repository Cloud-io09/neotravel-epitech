import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Client, ClientInput } from "@/shared/types/client";

type ClientRow = {
  id: string;
  organization: string | null;
  contact_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
};

function toClient(row: ClientRow): Client {
  return {
    id: row.id,
    organization: row.organization,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at
  };
}

export async function createClient(input: ClientInput) {
  if (shouldUseDemoData()) return demoStore.createClient(input);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      organization: input.organization,
      contact_name: input.contactName ?? null,
      email: input.email,
      phone: input.phone ?? null
    })
    .select("id, organization, contact_name, email, phone, created_at")
    .single();

  if (error) throw error;
  return toClient(data as ClientRow);
}

export async function listClients() {
  if (shouldUseDemoData()) return demoStore.listClients();

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, organization, contact_name, email, phone, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as ClientRow[]).map(toClient);
}
