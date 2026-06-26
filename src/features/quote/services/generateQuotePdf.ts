import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import { getQuoteById } from "./getQuoteById";

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function euro(value: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value);
}

function line(text: string, x: number, y: number, size = 10, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${ascii(text)}) Tj ET`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "A confirmer";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatTripDates(departureDate: string | null | undefined, returnDate: string | null | undefined) {
  const departure = formatDate(departureDate);
  if (!returnDate) return departure;

  return `${departure} - retour ${formatDate(returnDate)}`;
}

function buildPdf(lines: string[]) {
  const content = lines.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join(""), "utf8"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(""), "utf8");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");
  offsets.slice(1).forEach((offset) => {
    chunks.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Uint8Array(Buffer.from(chunks.join(""), "utf8"));
}

export async function generateQuotePdf(quoteId: string) {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;

  const lead = await getLeadDetail(quote.leadId);
  const calculation = quote.calculation;
  const routeLabel =
    lead?.departureCity && lead?.arrivalCity
      ? `${lead.departureCity} -> ${lead.arrivalCity}`
      : calculation.breakdown.routeLabel;
  const clientName = lead?.organization ?? "Client / organisation";
  const clientEmail = lead?.email ?? "Email a confirmer";
  const passengerLabel = lead?.passengerCount ? `${lead.passengerCount} passagers` : "A confirmer";
  const tripDates = formatTripDates(lead?.departureDate, lead?.returnDate);
  const options = lead?.options.length ? lead.options.join(", ") : "Aucune option ajoutee";
  const pdfLines = [
    line("NeoTravel", 48, 794, 22, "F2"),
    line("Transport de voyageurs - devis client", 48, 778, 9),
    line("DEVIS", 468, 794, 26, "F2"),
    line(`Reference: ${calculation.quoteNumber}`, 392, 774, 10, "F2"),
    line(`Date emission: ${new Date().toLocaleDateString("fr-FR")}`, 48, 742, 10),
    line("Validite offre: 7 jours", 220, 742, 10),
    line("Statut: Regles metier validees", 370, 742, 10),
    line("Emetteur", 48, 704, 12, "F2"),
    line("NeoTravel SAS", 48, 686, 10),
    line("contact@neotravel.fr", 48, 672, 10),
    line("Client", 320, 704, 12, "F2"),
    line(clientName, 320, 686, 10),
    line(`Email: ${clientEmail}`, 320, 672, 10),
    line(`Reference demande: ${quote.leadId}`, 320, 658, 10),
    line("Prestation demandee", 48, 630, 14, "F2"),
    line(`Trajet: ${routeLabel}`, 48, 608, 10),
    line(`Date: ${tripDates}`, 48, 594, 10),
    line(`Passagers: ${passengerLabel}`, 48, 580, 10),
    line(`Options: ${options}`, 48, 566, 10),
    line(`Distance controlee: ${calculation.distanceKm} km`, 48, 552, 10),
    line(`Vehicule: ${calculation.breakdown.vehicleLabel}`, 48, 538, 10),
    line("Detail estimatif", 48, 504, 14, "F2"),
    line("Designation", 48, 482, 10, "F2"),
    line("Montant", 470, 482, 10, "F2"),
    ...calculation.lines.flatMap((item, index) => [
      line(item.label, 48, 460 - index * 18, 10),
      line(`${euro(item.amount)} EUR`, 456, 460 - index * 18, 10)
    ]),
    line("Total HT", 360, 356, 11, "F2"),
    line(`${euro(calculation.priceHt)} EUR`, 456, 356, 11, "F2"),
    line("TVA", 360, 338, 11, "F2"),
    line(`${euro(calculation.vatAmount)} EUR`, 456, 338, 11, "F2"),
    line("Total TTC", 360, 316, 14, "F2"),
    line(`${euro(calculation.priceTtc)} EUR`, 456, 316, 14, "F2"),
    line("Validation metier", 48, 278, 12, "F2"),
    line(`Hash devis: ${calculation.deterministicHash.slice(0, 24)}...`, 48, 260, 9),
    line(`Matrice: ${calculation.breakdown.matrixVersion}`, 48, 246, 9),
    line("Ce document est un devis, pas une facture.", 48, 192, 10, "F2"),
    line("Bon pour accord client", 48, 120, 11, "F2"),
    line("Validation NeoTravel: genere apres regles metier.", 320, 120, 11, "F2")
  ];

  return {
    body: buildPdf(pdfLines),
    fileName: `${calculation.quoteNumber}.pdf`,
    mimeType: "application/pdf"
  };
}
