import { generateQuotePdf } from "@/features/quote/services/generateQuotePdf";
import { jsonError } from "@/shared/lib/utils/apiResponse";

export async function GET(_: Request, { params }: { params: Promise<{ quoteId: string }> }) {
  const { quoteId } = await params;
  const pdf = await generateQuotePdf(quoteId);

  if (!pdf) return jsonError("NOT_FOUND", "Devis introuvable.", 404);

  return new Response(pdf.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${pdf.fileName}"`,
      "Content-Type": pdf.mimeType
    }
  });
}
