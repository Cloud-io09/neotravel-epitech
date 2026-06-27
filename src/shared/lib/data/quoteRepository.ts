import { shouldUseDemoData } from "@/shared/lib/data/dataMode";
import { demoStore } from "@/shared/lib/demo/demoStore";
import { createSupabaseAdminClient } from "@/shared/lib/supabase/admin";
import type { Quote } from "@/shared/types/quote";

type QuoteRow = {
 id: string;
 lead_id: string;
 status: Quote["status"];
 calculation: Quote["calculation"];
 created_at?: string | null;
 updated_at?: string | null;
};

function toQuote(row: QuoteRow): Quote {
 return {
  id: row.id,
  leadId: row.lead_id,
  status: row.status,
  calculation: row.calculation,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? null
 };
}

const quoteSelection = "id, lead_id, status, calculation, created_at, updated_at";

export async function createQuoteRecord(input: Parameters<typeof demoStore.createQuote>[0]) {
 if (shouldUseDemoData()) return demoStore.createQuote(input);

 const supabase = createSupabaseAdminClient();
 const { calculation } = input;
 const { data, error } = await supabase
  .from("quotes")
  .insert({
   lead_id: input.leadId,
   status: input.status ?? "QUOTE_READY",
   price_ht: calculation.subtotal,
   vat_amount: calculation.vatAmount,
   price_ttc: calculation.totalAmount,
   currency: calculation.currency,
   breakdown: calculation.breakdown,
   calculation,
   deterministic_hash: calculation.deterministicHash
  })
  .select(quoteSelection)
  .single();

 if (error) throw error;
 return toQuote(data as QuoteRow);
}

export async function getQuoteRecordById(id: string) {
 if (shouldUseDemoData()) return demoStore.getQuoteById(id);

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("quotes")
  .select(quoteSelection)
  .eq("id", id)
  .maybeSingle();

 if (error) throw error;
 return data ? toQuote(data as QuoteRow) : null;
}

export async function listQuotes() {
 if (shouldUseDemoData()) return demoStore.listQuotes();

 const supabase = createSupabaseAdminClient();
 const { data, error } = await supabase
  .from("quotes")
  .select(quoteSelection)
  .order("created_at", { ascending: false });

 if (error) throw error;
 return (data as QuoteRow[]).map(toQuote);
}

export async function updateQuoteStatus(id: string, status: Quote["status"]) {
 if (!shouldUseDemoData()) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
   .from("quotes")
   .update({ status })
   .eq("id", id)
   .select(quoteSelection)
   .single();

  if (error) throw error;
  return toQuote(data as QuoteRow);
 }

 const quote = demoStore.getQuoteById(id);
 if (!quote) return null;
 quote.status = status;
 return quote;
}
