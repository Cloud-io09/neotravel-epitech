import { createServerSupabaseClient } from "../../../../lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ quoteId: string }> },
): Promise<Response> {
  const { quoteId } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("quotes")
    .select("*, leads(departure_city, arrival_city, departure_date, passenger_count, trip_type)")
    .eq("id", quoteId)
    .single();

  if (error || !data) {
    return Response.json({ error: "Devis introuvable." }, { status: 404 });
  }

  const breakdown = data.breakdown as Record<string, unknown>;
  const lead = data.leads as Record<string, unknown> | null;

  const { vehicle_code: _vc, ...breakdownData } = (breakdown ?? {}) as Record<string, unknown>;

  return Response.json({
    quoteNumber: data.quote_number as string,
    vehicleCode: (breakdown?.vehicle_code as string) ?? "",
    distanceKm: data.distance_km as number,
    priceHt: data.price_ht as number,
    vatAmount: data.tva_10pct as number,
    priceTtc: data.price_ttc as number,
    departureCity: (lead?.departure_city as string | null) ?? undefined,
    arrivalCity: (lead?.arrival_city as string | null) ?? undefined,
    departureDate: (lead?.departure_date as string | null) ?? undefined,
    passengerCount: (lead?.passenger_count as number | null) ?? undefined,
    createdAt: data.created_at as string,
    breakdown: Object.keys(breakdownData).length > 0 ? breakdownData : undefined,
  });
}
