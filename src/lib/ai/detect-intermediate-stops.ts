import type { LeadQualification } from "../domain/schemas";

// Note: use "(?:^|[^\\p{L}])" instead of "\\b" — the ASCII word boundary is unreliable before
// accented starts ("étape", "escale" after a comma) under the /u flag.
const STOP_NOUN = "(?:arr[eê]ts?|arrets?|stops?|[ée]tapes?|pauses?|escales?|haltes?)";

const NEGATED_STOP_PATTERN = new RegExp(
  `(?:^|[^\\p{L}])(?:sans\\s+(?:aucun\\s+)?(?:faire\\s+d['’]?)?${STOP_NOUN}|pas\\s+d['’]?${STOP_NOUN})`,
  "iu",
);

const STOP_PATTERNS = [
  // "(un) arrêt/escale/étape (intermédiaire) à/dans/via X"
  new RegExp(
    `(?:^|[^\\p{L}])(?:un|une|des|le|la|petit|petite)?\\s*${STOP_NOUN}(?:\\s+interm[ée]diaires?)?\\s+(?:à|a|au|aux|dans|via|par|pr[eè]s\\s+de)\\s+(?<stop>[\\p{L}][\\p{L}'’\\-]*(?:\\s+[\\p{L}][\\p{L}'’\\-]*){0,2})`,
    "iu",
  ),
  // "via / en passant par / passer par / détour par X"
  /(?:^|[^\p{L}])(?:via|en\s+passant\s+par|passer?\s+par|passe\s+par|(?:un\s+)?d[eé]tour\s+par)\s+(?<stop>[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*){0,2})/iu,
  // "on s'arrête à X" / "s'arrêter à X"
  /(?:^|[^\p{L}])s['’]arr[eê]te(?:r|nt)?\s+(?:à|a|au|aux|dans|sur)\s+(?<stop>[\p{L}][\p{L}'’\-]*(?:\s+[\p{L}][\p{L}'’\-]*){0,2})/iu,
];

const ROUTE_COMPLEXITY_PATTERN =
  /(?:^|[^\p{L}])(?:arr[eê]t|arret|stop|[ée]tape|pause|escale|halte|via|passer\s+par|passe\s+par|en\s+passant\s+par|d[eé]tour|ramasser|r[eé]cup[eé]rer|s['’]arr[eê]te)/iu;

// Chained / multi-destination signals (not just "via X").
const PLUSIEURS_PATTERN =
  /\bplusieurs\s+(?:[ée]tapes?|arr[eê]ts?|villes?|destinations?|points?\s+de\s+d[eé]pose)\b/iu;
const ARROW_CHAIN_PATTERN = /(?:→|->)[^→]*(?:→|->)/u; // 2+ arrows: A → B → C
const PUIS_CHAIN_PATTERN = /\bpuis\b[^.!?]*\bpuis\b/iu; // 2+ "puis": A puis B puis C

/**
 * Marks multi-step / multi-destination requests as manual-review-only. The direct-route
 * pricing engine has no safe way to price an intermediate stop or a multi-leg trip, so
 * this guardrail is deterministic and independent from the model extraction.
 */
export function detectIntermediateStops(message: string): Partial<LeadQualification> {
  if (NEGATED_STOP_PATTERN.test(message)) return {};

  const chained =
    PLUSIEURS_PATTERN.test(message) ||
    ARROW_CHAIN_PATTERN.test(message) ||
    PUIS_CHAIN_PATTERN.test(message);

  if (!ROUTE_COMPLEXITY_PATTERN.test(message) && !chained) {
    return {};
  }

  const stops = [
    ...STOP_PATTERNS.flatMap((pattern) => {
      const match = pattern.exec(message);
      const stop = match?.groups?.stop ? normalizeStop(match.groups.stop) : undefined;
      return stop ? [stop] : [];
    }),
    ...extractChainStops(message),
  ];

  return {
    has_intermediate_stop: true,
    ...(stops.length > 0 ? { intermediate_stops: uniqueStops(stops) } : {}),
  };
}

/** Best-effort middle-stop extraction from an explicit chain (A → B → C / A puis B puis C). */
function extractChainStops(message: string): string[] {
  for (const splitter of [/\s*(?:→|->)\s*/u, /\s+puis\s+/iu]) {
    if (!splitter.test(message)) continue;
    const parts = message.split(splitter).map((part) => part.trim()).filter(Boolean);
    if (parts.length < 3) continue;
    const middle = parts.slice(1, -1).map(cityToken);
    // Only trust the extraction when every middle segment is a clean city token.
    if (middle.every(Boolean)) {
      return middle.map((city) => normalizeStop(city as string)).filter((s): s is string => Boolean(s));
    }
  }
  return [];
}

function cityToken(segment: string): string | undefined {
  const city = segment.replace(/[.!?,;]+$/u, "").trim();
  if (/^[\p{L}][\p{L}'’\- ]{1,40}$/u.test(city) && city.split(/\s+/u).length <= 3) return city;
  return undefined;
}

function normalizeStop(value: string): string | undefined {
  const withoutFillers = value
    .replace(/\b(?:en\s+fait|enfte|en\s+chemin|sur\s+le\s+trajet|svp|s['’]il\s+vous\s+pla[iî]t)\b.*$/iu, "")
    .trim();

  if (!withoutFillers) return undefined;
  if (isNonCityStopToken(withoutFillers)) return undefined;

  return withoutFillers
    .toLocaleLowerCase("fr-FR")
    .replace(/(^|[\s\-'])[\p{L}]/gu, (character) => character.toLocaleUpperCase("fr-FR"));
}

function isNonCityStopToken(value: string): boolean {
  const normalized = value.toLocaleLowerCase("fr-FR").replace(/[.!?,;]+$/u, "").trim();

  return (
    /^(?:prévoir|prevoir|confirmer|faire|organiser|gérer|gerer|planifier)$/iu.test(normalized) ||
    /^(?:le|la|un|une|du|des)\s+(?:trajet|chemin|route)$/iu.test(normalized) ||
    /^(?:trajet|chemin|route)$/iu.test(normalized)
  );
}

function uniqueStops(stops: string[]): string[] {
  const seen = new Set<string>();

  return stops.filter((stop) => {
    const normalized = stop.toLocaleLowerCase("fr-FR");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
