/**
 * Deterministic city canonicalization. The LLM may understand "Pari" as "Paris", but the
 * deterministic extraction stores the raw token, so the side panel shows "Pari". This maps
 * a typed/partial city to its canonical French name when the match is unambiguous — without
 * a network call and without risky over-correction (an unknown small town is left as typed).
 */

// Canonical spellings of the most common French cities + frequent group-travel destinations.
const KNOWN_CITIES = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Montpellier", "Strasbourg",
  "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble",
  "Dijon", "Angers", "Nîmes", "Villeurbanne", "Clermont-Ferrand", "Le Mans", "Aix-en-Provence",
  "Brest", "Tours", "Amiens", "Limoges", "Annecy", "Perpignan", "Besançon", "Metz", "Orléans",
  "Rouen", "Mulhouse", "Caen", "Nancy", "Avignon", "Cannes", "Deauville", "Étretat", "Biarritz",
  "La Rochelle", "Chamonix", "Bayonne", "Pau", "Bourges", "Troyes", "Lorient", "Valence",
  "Chambéry", "Vannes", "Quimper", "Colmar", "Antibes", "Versailles", "Disneyland",
];

function normalize(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("fr-FR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[-']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_TO_CANONICAL = new Map(KNOWN_CITIES.map((city) => [normalize(city), city]));

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) dist[i][0] = i;
  for (let j = 0; j < cols; j += 1) dist[0][j] = j;
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(dist[i - 1][j] + 1, dist[i][j - 1] + 1, dist[i - 1][j - 1] + cost);
    }
  }
  return dist[a.length][b.length];
}

/**
 * Returns the canonical city name when the input unambiguously refers to a known city
 * (exact match, a unique prefix of length ≥ 3, or a unique edit-distance-1 match). Otherwise
 * returns the input unchanged — never guesses an unknown town into a big city.
 */
export function canonicalizeCity(input: string | null | undefined): string | null | undefined {
  if (!input) return input;
  const normalized = normalize(input);
  if (!normalized) return input;

  const exact = NORMALIZED_TO_CANONICAL.get(normalized);
  if (exact) return exact;

  const keys = [...NORMALIZED_TO_CANONICAL.keys()];

  if (normalized.length >= 3) {
    const prefixHits = keys.filter((key) => key.startsWith(normalized));
    if (prefixHits.length === 1) return NORMALIZED_TO_CANONICAL.get(prefixHits[0]);
  }

  const distanceHits = keys.filter((key) => editDistance(normalized, key) <= 1);
  if (distanceHits.length === 1) return NORMALIZED_TO_CANONICAL.get(distanceHits[0]);

  return input;
}

export function isKnownCity(input: string | null | undefined): boolean {
  if (!input) return false;
  const normalized = normalize(input);
  if (!normalized) return false;

  if (NORMALIZED_TO_CANONICAL.has(normalized)) return true;

  const keys = [...NORMALIZED_TO_CANONICAL.keys()];
  if (normalized.length >= 3 && keys.filter((key) => key.startsWith(normalized)).length === 1) return true;

  return keys.filter((key) => editDistance(normalized, key) <= 1).length === 1;
}
