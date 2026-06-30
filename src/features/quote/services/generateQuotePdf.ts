import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import { defaultLanguage, translations, type LanguageCode } from "@/shared/i18n/translations";
import type { QuoteCalculation } from "@/shared/types/quote";
import { getQuoteOptionLines } from "@/shared/lib/quotes/quoteOptionLines";
import { getQuoteById } from "./getQuoteById";

const colors = {
  blue: "0.039 0.239 0.561",
  navy: "0.035 0.102 0.208",
  red: "0.800 0.078 0.145",
  gold: "0.890 0.620 0.161",
  text: "0.078 0.110 0.169",
  muted: "0.361 0.420 0.510",
  border: "0.859 0.890 0.941",
  paleBlue: "0.969 0.980 1.000",
  chipBlue: "0.910 0.949 1.000",
  green: "0.020 0.510 0.278",
  paleGreen: "0.898 0.980 0.929",
  white: "1 1 1"
};

const pdfLanguages = ["FR", "EN", "ES", "IT", "PT", "DE"] as const;
type PdfLanguage = (typeof pdfLanguages)[number];
const allLanguages = ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"] as const;

const pdfLegalNotes: Record<PdfLanguage, string> = {
  FR: "Version francaise de reference. Toute traduction est fournie pour information.",
  EN: "Reference French version. This translation is provided for information.",
  ES: "Version francesa de referencia. Esta traduccion se facilita a titulo informativo.",
  IT: "Versione francese di riferimento. Questa traduzione e fornita a titolo informativo.",
  PT: "Versao francesa de referencia. Esta traducao e fornecida a titulo informativo.",
  DE: "Massgeblich ist die franzosische Fassung. Diese Ubersetzung dient nur zur Information."
};

function resolvePdfLanguage(language: string | null | undefined): PdfLanguage {
  if (language && pdfLanguages.includes(language as PdfLanguage)) return language as PdfLanguage;
  return "FR";
}

function resolveRequestedLanguage(language: string | null | undefined): LanguageCode {
  if (language && allLanguages.includes(language as LanguageCode)) return language as LanguageCode;
  return defaultLanguage;
}

function translatePdf(source: string, language: PdfLanguage) {
  if (language === defaultLanguage) return source;
  return translations[language as Exclude<LanguageCode, "FR">]?.[source] ?? source;
}

function translateAny(source: string, language: LanguageCode) {
  if (language === defaultLanguage) return source;
  return translations[language as Exclude<LanguageCode, "FR">]?.[source] ?? source;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ascii(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/[()\\]/g, "\\$&");
}

function euro(value: number) {
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)} EUR`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "À confirmer";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatTripDates(departureDate: string | null | undefined, returnDate: string | null | undefined) {
  const departure = formatDate(departureDate);
  if (!returnDate) return departure;

  return `${departure} - retour ${formatDate(returnDate)}`;
}

function formatTripType(value: string | null | undefined) {
  if (value === "round_trip") return "Aller-retour";
  if (value === "one_way") return "Aller simple";

  return "À confirmer";
}

function formatTraceabilityDate(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";

  return `${part("day")}/${part("month")}/${part("year")} a ${part("hour")}:${part("minute")}`;
}

function traceabilityReference(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";

  return `NTV-${part("year")}${part("month")}${part("day")}-${part("hour")}${part("minute")}`;
}

function pricingEngineLabel(matrixVersion: string) {
  const version = matrixVersion.match(/v\d+/i)?.[0] ?? matrixVersion;
  return `NeoTravel Pricing Engine ${version}`;
}

function rect(x: number, y: number, width: number, height: number, fill: string, stroke?: string) {
  if (!stroke) return `q ${fill} rg ${x} ${y} ${width} ${height} re f Q`;
  return `q ${fill} rg ${stroke} RG 1 w ${x} ${y} ${width} ${height} re B Q`;
}

function text(value: string, x: number, y: number, size = 10, font = "F1", fill = colors.text) {
  return `q ${fill} rg BT /${font} ${size} Tf ${x} ${y} Td (${ascii(value)}) Tj ET Q`;
}

function line(x1: number, y1: number, x2: number, y2: number, stroke = colors.border, width = 1) {
  return `q ${stroke} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S Q`;
}

function buildPdf(commands: string[]) {
  const content = commands.join("\n");
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

function field(commands: string[], label: string, value: string, x: number, y: number) {
  commands.push(text(label, x, y, 7, "F2", colors.muted));
  commands.push(text(value, x, y - 14, 9, "F2", colors.text));
}

function splitTextToLines(value: string, maxChars: number, maxLines: number) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const pushChunk = (chunk: string) => {
    if (!chunk) return;
    if (chunk.length <= maxChars) {
      lines.push(chunk);
      return;
    }
    for (let index = 0; index < chunk.length; index += maxChars) {
      lines.push(chunk.slice(index, index + maxChars));
    }
  };

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars) {
      if (current) lines.push(current);
      current = "";
      pushChunk(word);
      continue;
    }
    current = next;
  }

  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

function pushWrappedText(
  commands: string[],
  value: string,
  x: number,
  y: number,
  options: { fill?: string; font?: string; lineHeight?: number; maxChars?: number; maxLines?: number; size?: number } = {}
) {
  const lineHeight = options.lineHeight ?? 9;
  splitTextToLines(value, options.maxChars ?? 58, options.maxLines ?? 2).forEach((lineText, index) => {
    commands.push(
      text(lineText, x, y - index * lineHeight, options.size ?? 7, options.font ?? "F1", options.fill ?? colors.text)
    );
  });
}

function fieldWrapped(
  commands: string[],
  label: string,
  value: string,
  x: number,
  y: number,
  options: { fill?: string; font?: string; maxChars?: number; maxLines?: number; size?: number } = {}
) {
  const maxChars = options.maxChars ?? 28;
  const maxLines = options.maxLines ?? 2;
  const size = options.size ?? 9;
  const lineHeight = 11;
  const valueStartY = label ? y - 14 : y;

  if (label) commands.push(text(label, x, y, 7, "F2", colors.muted));
  splitTextToLines(value, maxChars, maxLines).forEach((lineText, index) => {
    commands.push(text(lineText, x, valueStartY - index * lineHeight, size, options.font ?? "F2", options.fill ?? colors.text));
  });
}

function edgeExecutablePath() {
  const candidates = [
    process.env.NEOTRAVEL_PDF_BROWSER,
    // macOS
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    // Windows
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    // Linux
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/microsoft-edge",
    // Bare commands resolved via PATH (last resort)
    "google-chrome",
    "chromium",
    "chromium-browser",
    "msedge"
  ].filter(Boolean) as string[];

  // Prefer an absolute path that actually exists; only then fall back to a PATH-resolved command.
  // The previous heuristic returned the first non-Windows entry ("google-chrome") without checking
  // existence, so macOS/Linux installs at standard locations were never used.
  const installed = candidates.find((candidate) => path.isAbsolute(candidate) && existsSync(candidate));
  if (installed) return installed;

  return candidates.find((candidate) => !path.isAbsolute(candidate)) ?? candidates[0];
}

function printHtmlToPdf(html: string) {
  return new Promise<Uint8Array | null>(async (resolve) => {
    const dir = path.join(tmpdir(), `neotravel-pdf-${randomUUID()}`);
    const htmlPath = path.join(dir, "quote.html");
    const pdfPath = path.join(dir, "quote.pdf");

    try {
      await mkdir(dir, { recursive: true });
      await writeFile(htmlPath, html, "utf8");

      const browser = spawn(edgeExecutablePath(), [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--disable-extensions",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=8000",
        `--print-to-pdf=${pdfPath}`,
        `file:///${htmlPath.replace(/\\/g, "/")}`
      ]);

      const timeout = setTimeout(() => {
        browser.kill();
        resolve(null);
      }, 20000);

      browser.on("error", async () => {
        clearTimeout(timeout);
        await rm(dir, { force: true, recursive: true }).catch(() => undefined);
        resolve(null);
      });

      browser.on("exit", async (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          await rm(dir, { force: true, recursive: true }).catch(() => undefined);
          resolve(null);
          return;
        }

        const pdf = await readFile(pdfPath).catch(() => null);
        await rm(dir, { force: true, recursive: true }).catch(() => undefined);
        resolve(pdf ? new Uint8Array(pdf) : null);
      });
    } catch {
      await rm(dir, { force: true, recursive: true }).catch(() => undefined);
      resolve(null);
    }
  });
}

async function generateBrowserPdf(input: {
  calculation: QuoteCalculation;
  clientEmail: string;
  clientName: string;
  engineLabel: string;
  language: LanguageCode;
  optionLabel: string;
  passengerLabel: string;
  quoteId: string;
  routeLabel: string;
  traceabilityDate: string;
  traceabilityId: string;
  tripDates: string;
  tripType: string;
}) {
  const tr = (source: string) => translateAny(source, input.language);
  const direction = input.language === "AR" ? "rtl" : "ltr";
  const align = input.language === "AR" ? "right" : "left";
  const legalNote =
    input.language === "ZH"
      ? "法文版本为参考版本。翻译仅供信息参考。"
      : input.language === "AR"
        ? "النسخة الفرنسية هي النسخة المرجعية. الترجمة مقدمة للمعلومات فقط."
        : pdfLegalNotes[resolvePdfLanguage(input.language)];

  const rows = input.calculation.lines
    .slice(0, 5)
    .map(
      (item) => `<tr>
        <td>${escapeHtml(tr(item.label))}</td>
        <td>1</td>
        <td>${escapeHtml(euro(item.amount))}</td>
        <td>${Math.round(input.calculation.vatRate * 100)}%</td>
        <td><strong>${escapeHtml(euro(item.amount + item.amount * input.calculation.vatRate))}</strong></td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html>
<html lang="${input.language.toLowerCase()}" dir="${direction}">
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; width: 210mm; height: 297mm; overflow: hidden; background: #fff; }
    body { color: #141c2b; font-family: Arial, "Microsoft YaHei", "Noto Sans CJK SC", Tahoma, sans-serif; direction: ${direction}; text-align: ${align}; overflow-wrap: anywhere; word-break: break-word; }
    .page { width: 210mm; height: 297mm; padding: 7mm 9mm; overflow: hidden; page-break-after: avoid; page-break-inside: avoid; display: flex; flex-direction: column; }
    .bars { display: grid; grid-template-columns: 34% 16% 50%; height: 3mm; border-radius: 2mm 2mm 0 0; overflow: hidden; flex-shrink: 0; }
    .bars span:nth-child(1) { background: #cc1425; }
    .bars span:nth-child(2) { background: #e39e29; }
    .bars span:nth-child(3) { background: #0a3d8f; }
    .paper { border: 1px solid #dbe3f0; border-top: 0; padding: 7mm 9mm 6mm; overflow: hidden; display: flex; flex-direction: column; gap: 3mm; flex: 1; min-height: 0; page-break-inside: avoid; break-inside: avoid; }
    .quoteContent { display: flex; flex-direction: column; gap: 3mm; flex-shrink: 0; }
    .header { display: flex; justify-content: space-between; gap: 8mm; align-items: flex-start; flex-shrink: 0; }
    .brand { font-size: 16pt; font-weight: 800; color: #0a3d8f; line-height: 1.1; }
    .brand b { color: #cc1425; }
    .sub { color: #5c6b82; font-size: 6.5pt; font-weight: 700; line-height: 1.3; }
    .header > div:first-child { flex: 1; min-width: 0; max-width: 95mm; }
    .ref { text-align: ${direction === "rtl" ? "left" : "right"}; flex-shrink: 0; max-width: 70mm; }
    h1 { margin: 0; color: #091a35; font-size: 20pt; line-height: 1.05; overflow-wrap: anywhere; }
    .strip, .trip, .totals { background: #f7faff; border: 1px solid #dbe3f0; border-radius: 6px; page-break-inside: avoid; break-inside: avoid; }
    .strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 0; padding: 3.5mm; flex-shrink: 0; }
    .label { color: #5c6b82; display: block; font-size: 6.5pt; font-weight: 800; margin-bottom: 1mm; }
    strong { color: #141c2b; font-weight: 800; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin: 0; align-items: stretch; flex-shrink: 0; page-break-inside: avoid; break-inside: avoid; }
    .box { border: 1px solid #dbe3f0; border-radius: 6px; padding: 4mm; min-height: 0; overflow: hidden; }
    h2 { margin: 0 0 2.5mm; color: #091a35; font-size: 10.5pt; line-height: 1.15; }
    p { margin: 0 0 1.5mm; font-size: 8pt; line-height: 1.35; overflow-wrap: anywhere; }
    .trip { padding: 4.5mm; margin: 0; overflow: hidden; flex-shrink: 0; }
    .tripGrid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3.5mm 5mm; }
    .tripGrid > div { min-width: 0; overflow: hidden; }
    .tripGrid strong { display: block; font-size: 8pt; line-height: 1.3; overflow-wrap: anywhere; }
    .chip { display: block; width: fit-content; max-width: 100%; margin-top: 3mm; border: 1px solid #dbe3f0; border-radius: 5px; padding: 1.5mm 4mm; color: #0a3d8f; background: #e8f2ff; font-size: 7pt; font-weight: 800; line-height: 1.3; white-space: normal; overflow-wrap: anywhere; }
    .breakdown { flex-shrink: 0; page-break-inside: avoid; break-inside: avoid; }
    .breakdown > h2 { margin-bottom: 2mm; }
    table { width: 100%; border-collapse: collapse; margin: 0; font-size: 7.5pt; table-layout: fixed; page-break-inside: avoid; break-inside: avoid; }
    th { background: #091a35; color: #fff; text-align: ${align}; padding: 2mm; vertical-align: top; overflow-wrap: anywhere; }
    td { border-bottom: 1px solid #dbe3f0; padding: 2mm; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
    th:nth-child(1), td:nth-child(1) { width: 36%; }
    th:nth-child(2), td:nth-child(2) { width: 8%; }
    th:nth-child(3), td:nth-child(3) { width: 18%; }
    th:nth-child(4), td:nth-child(4) { width: 10%; }
    th:nth-child(5), td:nth-child(5) { width: 28%; }
    tr:nth-child(even) td { background: #f7faff; }
    .bottom { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, .9fr); gap: 5mm; margin: 0; align-items: start; flex-shrink: 0; page-break-inside: avoid; break-inside: avoid; }
    .trace { background: #e5faed; border: 1px solid #b8e5c7; border-radius: 6px; padding: 3.5mm 4.5mm; overflow: hidden; }
    .trace h3 { margin: 0 0 2.5mm; color: #058247; font-size: 9pt; line-height: 1.15; }
    .trace p { font-size: 7pt; line-height: 1.35; margin-bottom: 1.5mm; }
    .totals { padding: 3.5mm 4.5mm; overflow: hidden; }
    .totalLine { display: flex; justify-content: space-between; gap: 3mm; margin-bottom: 2.5mm; font-size: 9pt; font-weight: 800; }
    .totalLine span, .totalLine strong { min-width: 0; overflow-wrap: anywhere; }
    .totals .sub { display: block; margin-top: 1mm; line-height: 1.3; font-size: 6.5pt; }
    .conditions { border: 1px solid #dbe3f0; border-radius: 6px; padding: 3mm 4.5mm; margin: 0; overflow: hidden; flex-shrink: 0; page-break-inside: avoid; break-inside: avoid; }
    .conditions p { font-size: 7pt; line-height: 1.35; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; flex: 1; min-height: 48mm; align-items: stretch; page-break-inside: avoid; break-inside: avoid; }
    .sigBox { border: 1px solid #dbe3f0; border-radius: 6px; padding: 3.5mm 4.5mm 4mm; min-height: 46mm; height: 100%; display: flex; flex-direction: column; }
    .sigBox h3 { margin: 0; color: #091a35; font-size: 8.5pt; line-height: 1.15; flex-shrink: 0; }
    .sigArea { flex: 1; min-height: 24mm; margin-top: 2.5mm; border: 1px dashed #c5d3e8; border-radius: 5px; background: #fbfcff; }
    .sigBox--validated .sigArea { background: #f3fbf6; border-color: #b8e5c7; }
    .sigLine { display: block; margin-top: 3mm; padding-top: 2.5mm; border-top: 1px solid #dbe3f0; color: #5c6b82; font-size: 6.5pt; line-height: 1.3; flex-shrink: 0; }
    .sigNote { margin: 3mm 0 0; color: #058247; font-size: 6.5pt; line-height: 1.35; flex-shrink: 0; }
    @media print {
      html, body { width: 210mm; height: 297mm; overflow: hidden; }
      .page, .paper { page-break-inside: avoid; break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="page">
    <div class="bars"><span></span><span></span><span></span></div>
    <section class="paper">
      <div class="quoteContent">
      <header class="header">
        <div>
          <div class="brand">Neo <b>Travel</b></div>
          <div class="sub">${escapeHtml(tr("Transport de voyageurs - devis client"))}</div>
        </div>
        <div class="ref">
          <h1>${escapeHtml(tr("Devis").toUpperCase())}</h1>
          <div class="sub">No ${escapeHtml(input.calculation.quoteNumber)}</div>
        </div>
      </header>
      <section class="strip">
        <div><span class="label">${escapeHtml(tr("Date d'émission"))}</span><strong>${new Date().toLocaleDateString("fr-FR")}</strong></div>
        <div><span class="label">${escapeHtml(tr("Validité offre"))}</span><strong>${escapeHtml(tr("7 jours"))}</strong></div>
        <div><span class="label">${escapeHtml(tr("Canal envoi"))}</span><strong>Email</strong></div>
      </section>
      <section class="parties">
        <div class="box"><h2>${escapeHtml(tr("Émetteur"))}</h2><p>NeoTravel SAS</p><p>${escapeHtml(tr("Transport de voyageurs"))}</p><p>contact@neotravel.fr</p></div>
        <div class="box"><h2>${escapeHtml(tr("Client"))}</h2><p>${escapeHtml(input.clientName)}</p><p>${escapeHtml(tr("Email : "))}${escapeHtml(input.clientEmail)}</p><p>${escapeHtml(tr("Reference demande : "))}${escapeHtml(input.quoteId)}</p></div>
      </section>
      <section class="trip">
        <h2>${escapeHtml(tr("Prestation demandee"))}</h2>
        <div class="tripGrid">
          <div><span class="label">${escapeHtml(tr("Trajet"))}</span><strong>${escapeHtml(input.routeLabel)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Date et horaires"))}</span><strong>${escapeHtml(input.tripDates)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Passagers"))}</span><strong>${escapeHtml(input.passengerLabel)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Type de trajet"))}</span><strong>${escapeHtml(input.tripType)}</strong></div>
          <div><span class="label">${escapeHtml(tr("Véhicule"))}</span><strong>${escapeHtml(tr(input.calculation.breakdown.vehicleLabel))}</strong></div>
          <div><span class="label">${escapeHtml(tr("Distance"))}</span><strong>${input.calculation.distanceKm} km</strong></div>
        </div>
        <span class="chip">${escapeHtml(input.optionLabel)}</span>
      </section>
      <section class="breakdown">
        <h2>${escapeHtml(tr("Detail estimatif"))}</h2>
        <table><thead><tr><th>${escapeHtml(tr("Désignation"))}</th><th>${escapeHtml(tr("Qte"))}</th><th>${escapeHtml(tr("Prix HT"))}</th><th>TVA</th><th>${escapeHtml(tr("Total TTC"))}</th></tr></thead><tbody>${rows}</tbody></table>
      </section>
      <section class="bottom">
        <div class="trace"><h3>${escapeHtml(tr("Traçabilité du devis"))}</h3><p>${escapeHtml(tr("Calcul réalisé le : "))}${escapeHtml(input.traceabilityDate)}</p><p>${escapeHtml(tr("Moteur : "))}${escapeHtml(input.engineLabel)}</p><p>${escapeHtml(tr("Référence : "))}${escapeHtml(input.traceabilityId)}</p><p>${escapeHtml(tr("Devis généré automatiquement selon les règles métier NeoTravel, sous réserve de validation opérationnelle."))}</p><p>${escapeHtml(legalNote)}</p></div>
        <div class="totals"><div class="totalLine"><span>${escapeHtml(tr("Total HT"))}</span><strong>${escapeHtml(euro(input.calculation.priceHt))}</strong></div><div class="totalLine"><span>${escapeHtml(tr("TVA estimée"))}</span><strong>${escapeHtml(euro(input.calculation.vatAmount))}</strong></div><div class="totalLine"><span>${escapeHtml(tr("Total TTC"))}</span><strong>${escapeHtml(euro(input.calculation.priceTtc))}</strong></div><p class="sub">${escapeHtml(tr("Montant à confirmer après disponibilité finale"))}</p></div>
      </section>
      <section class="conditions"><h2>${escapeHtml(tr("Conditions et acceptation"))}</h2><p>${escapeHtml(tr("Offre valable sous reserve de disponibilite partenaires et chauffeur. Le devis devient contractuel apres signature electronique ou accord ecrit du client. Ce document est un devis, pas une facture."))}</p></section>
      </div>
      <section class="signatures" aria-label="${escapeHtml(tr("Bon pour accord client"))}">
        <div class="sigBox">
          <h3>${escapeHtml(tr("Bon pour accord client"))}</h3>
          <div class="sigArea" aria-hidden="true"></div>
          <span class="sigLine">${escapeHtml(tr("Date, nom et signature electronique"))}</span>
        </div>
        <div class="sigBox sigBox--validated">
          <h3>${escapeHtml(tr("Validation NeoTravel"))}</h3>
          <div class="sigArea" aria-hidden="true"></div>
          <p class="sigNote">${escapeHtml(tr("Généré automatiquement après validation règles métier."))}</p>
        </div>
      </section>
    </section>
  </main>
  <script>
    window.addEventListener("load", () => {
      const page = document.querySelector(".page");
      const paper = document.querySelector(".paper");
      if (!page || !paper) return;
      const pageHeight = Math.round(297 * 96 / 25.4);
      const pageWidth = Math.round(210 * 96 / 25.4);
      const contentHeight = page.scrollHeight;
      if (contentHeight > pageHeight) {
        const scale = pageHeight / contentHeight;
        page.style.transform = "scale(" + scale + ")";
        page.style.transformOrigin = "top left";
        page.style.width = pageWidth / scale + "px";
        page.style.height = pageHeight / scale + "px";
        document.body.style.width = pageWidth + "px";
        document.body.style.height = pageHeight + "px";
      }
    });
  </script>
</body>
</html>`;

  const body = await printHtmlToPdf(html);
  if (!body) return null;

  return {
    body,
    fileName: `${input.calculation.quoteNumber}-${input.language}.pdf`,
    mimeType: "application/pdf"
  };
}

export async function generateQuotePdf(quoteId: string, language?: string | null) {
  const quote = await getQuoteById(quoteId);
  if (!quote) return null;

  const requestedLanguage = resolveRequestedLanguage(language);
  const pdfLanguage = resolvePdfLanguage(language);
  const tr = (source: string) => translatePdf(source, pdfLanguage);
  const lead = await getLeadDetail(quote.leadId);
  const calculation = quote.calculation;
  const routeStops = lead?.intermediateStops ?? [];
  const routeLabel =
    lead?.departureCity && lead?.arrivalCity
      ? [lead.departureCity, ...routeStops, lead.arrivalCity].join(" -> ")
      : calculation.breakdown.routeLabel;
  const clientName = lead?.organization ?? tr("Client particulier / organisation");
  const clientEmail = lead?.email ?? tr("Email à confirmer");
  const passengerLabel = lead?.passengerCount ? `${lead.passengerCount} ${tr("passagers")}` : tr("À confirmer");
  const tripDates = `${formatTripDates(lead?.departureDate, lead?.returnDate)} - ${tr("horaires à confirmer")}`;
  const tripType = tr(formatTripType(lead?.tripType));
  const pricedOptions = getQuoteOptionLines(calculation.breakdown);
  const options = lead?.options.length ? lead.options : pricedOptions.map((option) => option.label);
  const generatedAt = new Date();
  const traceabilityDate = formatTraceabilityDate(generatedAt);
  const traceabilityId = traceabilityReference(generatedAt);
  const engineLabel = pricingEngineLabel(calculation.breakdown.matrixVersion);

  const optionLabel = options.length ? options.map((option) => tr(option)).join(" · ") : tr("Aucune option ajoutée");

  const browserPdf = await generateBrowserPdf({
    calculation,
    clientEmail,
    clientName,
    engineLabel,
    language: requestedLanguage,
    optionLabel: options.length ? options.map((option) => translateAny(option, requestedLanguage)).join(" · ") : translateAny("Aucune option ajoutée", requestedLanguage),
    passengerLabel: lead?.passengerCount ? `${lead.passengerCount} ${translateAny("passagers", requestedLanguage)}` : translateAny("À confirmer", requestedLanguage),
    quoteId: quote.leadId,
    routeLabel,
    traceabilityDate,
    traceabilityId,
    tripDates: `${formatTripDates(lead?.departureDate, lead?.returnDate)} - ${translateAny("horaires à confirmer", requestedLanguage)}`,
    tripType: translateAny(formatTripType(lead?.tripType), requestedLanguage)
  });

  if (browserPdf) {
    return {
      ...browserPdf,
      fileName: `${calculation.quoteNumber}-${requestedLanguage}.pdf`
    };
  }

  const commands: string[] = [
    rect(0, 0, 595, 842, colors.white),
    rect(40, 796, 515, 10, colors.blue),
    rect(40, 796, 132, 10, colors.red),
    rect(172, 796, 72, 10, colors.gold),
    rect(40, 80, 515, 716, colors.white, colors.border),
    text("Neo", 74, 748, 18, "F2", colors.blue),
    text("Travel", 116, 748, 18, "F2", colors.red),
    text(tr("Transport de voyageurs - devis client"), 74, 734, 7, "F1", colors.muted),
    rect(48, 733, 26, 26, colors.red),
    text("N", 57, 742, 12, "F2", colors.white),
    text(tr("Devis").toUpperCase(), 456, 744, 30, "F2", colors.navy),
    text(`No ${calculation.quoteNumber}`, 432, 724, 9, "F2", colors.muted),
    rect(66, 655, 463, 46, colors.paleBlue, colors.border)
  ];

  field(commands, tr("Date d'émission"), generatedAt.toLocaleDateString("fr-FR"), 82, 682);
  field(commands, tr("Validité offre"), tr("7 jours"), 240, 682);
  field(commands, tr("Canal envoi"), "Email", 410, 682);

  commands.push(rect(66, 550, 220, 82, colors.white, colors.border));
  commands.push(text(tr("Émetteur"), 80, 618, 12, "F2", colors.navy));
  commands.push(text("NeoTravel SAS", 80, 601, 9));
  commands.push(text(tr("Transport de voyageurs"), 80, 587, 9));
  commands.push(text("contact@neotravel.fr", 80, 573, 9));

  commands.push(rect(316, 550, 213, 82, colors.white, colors.border));
  commands.push(text(tr("Client"), 330, 618, 12, "F2", colors.navy));
  fieldWrapped(commands, "", clientName, 330, 604, { maxChars: 30, maxLines: 1, size: 9 });
  fieldWrapped(commands, "", `${tr("Email : ")}${clientEmail}`, 330, 588, { maxChars: 30, maxLines: 2, size: 8 });
  fieldWrapped(commands, "", `${tr("Reference demande : ")}${quote.leadId}`, 330, 562, { maxChars: 28, maxLines: 2, size: 8 });

  commands.push(rect(66, 378, 463, 138, colors.paleBlue, colors.border));
  commands.push(text(tr("Prestation demandee"), 80, 498, 13, "F2", colors.navy));
  fieldWrapped(commands, tr("Trajet"), routeLabel, 80, 474, { maxChars: 24, maxLines: 2 });
  fieldWrapped(commands, tr("Date et horaires"), tripDates, 250, 474, { maxChars: 24, maxLines: 2 });
  fieldWrapped(commands, tr("Passagers"), passengerLabel, 425, 474, { maxChars: 14, maxLines: 2 });
  fieldWrapped(commands, tr("Type de trajet"), tripType, 80, 442, { maxChars: 24, maxLines: 2 });
  fieldWrapped(commands, tr("Véhicule"), tr(calculation.breakdown.vehicleLabel), 250, 442, { maxChars: 24, maxLines: 2 });
  fieldWrapped(commands, tr("Distance"), `${calculation.distanceKm} km`, 425, 442, { maxChars: 14, maxLines: 1 });

  const optionLines = splitTextToLines(optionLabel, 52, 2);
  const chipHeight = 14 + optionLines.length * 10;
  commands.push(rect(80, 392, 420, chipHeight, colors.chipBlue, colors.border));
  optionLines.forEach((lineText, index) => {
    commands.push(text(lineText, 92, 402 - index * 10, 8, "F2", colors.blue));
  });

  commands.push(text(tr("Detail estimatif"), 66, 363, 13, "F2", colors.navy));
  commands.push(rect(66, 335, 463, 22, colors.navy));
  commands.push(text(tr("Désignation"), 80, 343, 8, "F2", colors.white));
  commands.push(text(tr("Qte"), 310, 343, 8, "F2", colors.white));
  commands.push(text(tr("Prix HT"), 356, 343, 8, "F2", colors.white));
  commands.push(text("TVA", 428, 343, 8, "F2", colors.white));
  commands.push(text(tr("Total TTC"), 474, 343, 8, "F2", colors.white));

  calculation.lines.slice(0, 5).forEach((item, index) => {
    const y = 313 - index * 28;
    const labelLines = splitTextToLines(tr(item.label), 34, 2);
    const rowHeight = Math.max(24, 10 + labelLines.length * 10);
    commands.push(rect(66, y - rowHeight + 18, 463, rowHeight, index % 2 === 0 ? colors.white : colors.paleBlue));
    commands.push(line(66, y - rowHeight + 18, 529, y - rowHeight + 18));
    labelLines.forEach((lineText, lineIndex) => {
      commands.push(text(lineText, 80, y + 2 - lineIndex * 10, 8));
    });
    commands.push(text("1", 313, y + 2, 8));
    commands.push(text(euro(item.amount), 354, y + 2, 8));
    commands.push(text(`${Math.round(calculation.vatRate * 100)}%`, 428, y + 2, 8));
    commands.push(text(euro(item.amount + item.amount * calculation.vatRate), 466, y + 2, 8, "F2"));
  });

  commands.push(rect(66, 200, 250, 102, colors.paleGreen, "0.722 0.898 0.780"));
  commands.push(text(tr("Traçabilité du devis"), 80, 289, 11, "F2", colors.green));
  commands.push(text(`${tr("Calcul réalisé le : ")}${traceabilityDate}`, 80, 271, 8));
  commands.push(text(`${tr("Moteur : ")}${engineLabel}`, 80, 257, 8));
  commands.push(text(`${tr("Référence : ")}${traceabilityId}`, 80, 243, 8));
  pushWrappedText(commands, tr("Devis généré automatiquement selon les règles métier NeoTravel, sous réserve de validation opérationnelle."), 80, 230, {
    fill: colors.green,
    maxChars: 58,
    maxLines: 2,
    size: 6.5
  });
  pushWrappedText(commands, pdfLegalNotes[pdfLanguage], 80, 215, {
    fill: colors.green,
    maxChars: 58,
    maxLines: 2,
    size: 6.5
  });

  commands.push(rect(340, 200, 189, 102, colors.paleBlue, colors.border));
  commands.push(text(tr("Total HT"), 358, 287, 9, "F2", colors.muted));
  commands.push(text(euro(calculation.priceHt), 450, 287, 9, "F2"));
  commands.push(text(tr("TVA estimée"), 358, 267, 9, "F2", colors.muted));
  commands.push(text(euro(calculation.vatAmount), 450, 267, 9, "F2"));
  commands.push(text(tr("Total TTC"), 358, 243, 12, "F2", colors.navy));
  commands.push(text(euro(calculation.priceTtc), 440, 243, 12, "F2", colors.navy));
  pushWrappedText(commands, tr("Montant à confirmer après disponibilité finale"), 358, 229, {
    fill: colors.muted,
    maxChars: 28,
    maxLines: 2,
    size: 7
  });

  commands.push(text(tr("Conditions et acceptation"), 66, 192, 11, "F2", colors.navy));
  pushWrappedText(
    commands,
    tr("Offre valable sous reserve de disponibilite partenaires et chauffeur. Le devis devient contractuel apres signature electronique ou accord ecrit du client. Ce document est un devis, pas une facture."),
    66,
    180,
    { maxChars: 95, maxLines: 2, size: 7 }
  );

  commands.push(rect(66, 80, 220, 78, colors.white, colors.border));
  commands.push(text(tr("Bon pour accord client"), 80, 148, 9, "F2", colors.navy));
  commands.push(rect(80, 98, 196, 42, colors.paleBlue, colors.border));
  commands.push(line(80, 90, 276, 90));
  commands.push(text(tr("Date, nom et signature electronique"), 80, 86, 6, "F1", colors.muted));

  commands.push(rect(316, 80, 213, 78, colors.white, colors.border));
  commands.push(text(tr("Validation NeoTravel"), 330, 148, 9, "F2", colors.navy));
  commands.push(rect(330, 98, 185, 42, colors.paleGreen, "0.722 0.898 0.780"));
  pushWrappedText(commands, tr("Généré automatiquement après validation règles métier."), 330, 86, {
    fill: colors.green,
    maxChars: 30,
    maxLines: 2,
    size: 6
  });

  return {
    body: buildPdf(commands),
    fileName: `${calculation.quoteNumber}-${pdfLanguage}.pdf`,
    mimeType: "application/pdf"
  };
}
