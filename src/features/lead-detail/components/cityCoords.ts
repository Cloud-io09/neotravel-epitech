// Coordonnées [lng, lat] (format GeoJSON / OSRM) des principales villes.
//
// SCAFFOLD : lookup statique pour la démo. Pour couvrir TOUTES les villes,
// brancher ici un géocodage réel (OpenRouteService / Nominatim) — l'infra
// distance du projet (src/shared/lib/distance) peut servir de point d'entrée.
const CITY_COORDS: Record<string, [number, number]> = {
 paris: [2.3522, 48.8566],
 lyon: [4.8357, 45.764],
 marseille: [5.3698, 43.2965],
 bordeaux: [-0.5792, 44.8378],
 lille: [3.0573, 50.6292],
 nantes: [-1.5536, 47.2184],
 toulouse: [1.4442, 43.6047],
 montpellier: [3.8767, 43.6108],
 nice: [7.262, 43.7102],
 strasbourg: [7.7521, 48.5734],
 rennes: [-1.6778, 48.1173],
 grenoble: [5.7245, 45.1885],
 "marne-la-vallee": [2.7833, 48.85],
 disney: [2.7833, 48.85],
 disneyland: [2.7833, 48.85],
 etretat: [0.2069, 49.7073],
 "le havre": [0.1079, 49.4944],
 deauville: [0.0707, 49.36],
 rouen: [1.0993, 49.4432],
 caen: [-0.3708, 49.1829],
 dijon: [5.0415, 47.322],
 reims: [4.0317, 49.2583],
 "saint-etienne": [4.3872, 45.4397],
 nancy: [6.1844, 48.6921],
 metz: [6.1757, 49.1193],
 tours: [0.6848, 47.3941],
 angers: [-0.5632, 47.4784],
 "le mans": [0.1996, 48.0061],
 brest: [-4.4861, 48.3904],
 avignon: [4.8055, 43.9493],
 cannes: [7.0174, 43.5528],
 annecy: [6.1294, 45.8992],
 "clermont-ferrand": [3.087, 45.7772],
 "aix-en-provence": [5.4474, 43.5297],
 perpignan: [2.8954, 42.6887],
 toulon: [5.928, 43.1242]
};

function normalize(city: string) {
 return city
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "");
}

/** Renvoie [lng, lat] pour une ville connue, sinon null (à géocoder). */
export function resolveCityCoords(city: string | null | undefined): [number, number] | null {
 if (!city) return null;
 return CITY_COORDS[normalize(city)] ?? null;
}
