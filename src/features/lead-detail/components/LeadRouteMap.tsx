"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { resolveCityCoords } from "./cityCoords";
import styles from "./leadMap.module.css";

type Props = {
 departureCity: string | null;
 arrivalCity: string | null;
};

type MapStatus = "loading" | "real" | "direct" | "unavailable";

function pinHtml(color: string, label: string) {
 return `<span style="display:grid;place-items:center;width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);color:#fff;font-size:11px;font-weight:900">${label}</span></span>`;
}

export function LeadRouteMap({ departureCity, arrivalCity }: Props) {
 const containerRef = useRef<HTMLDivElement>(null);
 const [status, setStatus] = useState<MapStatus>("loading");

 const staticFrom = resolveCityCoords(departureCity);
 const staticTo = resolveCityCoords(arrivalCity);

 useEffect(() => {
  if (!containerRef.current || !departureCity || !arrivalCity) {
   setStatus("unavailable");
   return;
  }

  let map: LeafletMap | undefined;
  let cancelled = false;
  setStatus("loading");

  (async () => {
   // 1) Real geocoded route via the shared ORS endpoint — covers any French city, so the
   //    map is no longer limited to the static lookup. [lat,lng] for Leaflet.
   let points: [number, number][] | null = null;
   let real = false;
   try {
    const res = await fetch("/api/routes/preview", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ departure: departureCity, arrival: arrivalCity }),
    });
    if (res.ok) {
     const data = (await res.json()) as { geometry?: [number, number][] };
     if (Array.isArray(data.geometry) && data.geometry.length > 1) {
      points = data.geometry.map(([lng, lat]) => [lat, lng] as [number, number]);
      real = true;
     }
    }
   } catch {
    // fall through to the static lookup
   }

   // 2) Fallback: static coordinates + direct line (no network / city not geocodable).
   if (!points && staticFrom && staticTo) {
    points = [
     [staticFrom[1], staticFrom[0]],
     [staticTo[1], staticTo[0]],
    ];
   }

   if (cancelled) return;
   if (!points || points.length < 1 || !containerRef.current) {
    setStatus("unavailable");
    return;
   }

   const L = (await import("leaflet")).default;
   if (cancelled || !containerRef.current) return;

   map = L.map(containerRef.current, { scrollWheelZoom: false });
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap",
   }).addTo(map);

   const a = points[0];
   const b = points[points.length - 1];
   L.marker(a, { icon: L.divIcon({ className: "", html: pinHtml("#123885", "D"), iconSize: [26, 26], iconAnchor: [13, 26] }) })
    .addTo(map)
    .bindPopup(`Départ · ${departureCity ?? ""}`);
   L.marker(b, { icon: L.divIcon({ className: "", html: pinHtml("#d51b29", "A"), iconSize: [26, 26], iconAnchor: [13, 26] }) })
    .addTo(map)
    .bindPopup(`Arrivée · ${arrivalCity ?? ""}`);

   const line = L.polyline(points, {
    color: "#123885",
    weight: 4,
    opacity: 0.85,
    dashArray: real ? undefined : "8 8",
   }).addTo(map);
   map.fitBounds(line.getBounds(), { padding: [30, 30] });
   window.setTimeout(() => map?.invalidateSize(), 60);
   setStatus(real ? "real" : "direct");
  })();

  return () => {
   cancelled = true;
   if (map) map.remove();
  };
  // staticFrom/staticTo are stable refs from the static table for a given city.
 }, [departureCity, arrivalCity, staticFrom, staticTo]);

 if (status === "unavailable") {
  return (
   <div className={styles.fallback}>
    <strong>Aperçu cartographique indisponible</strong>
    <span>
     {!departureCity || !arrivalCity
      ? "Ville de départ ou d’arrivée à confirmer."
      : "Le trajet n’a pas pu être localisé pour le moment."}
    </span>
   </div>
  );
 }

 return (
  <div className={styles.wrap}>
   <div ref={containerRef} className={styles.map} aria-label={`Trajet ${departureCity} vers ${arrivalCity}`} />
   <p className={styles.caption}>
    {status === "loading"
     ? "Chargement de la carte…"
     : status === "real"
       ? "Tracé routier réel (OpenStreetMap / OpenRouteService)."
       : "Tracé direct — départ et arrivée géolocalisés."}
   </p>
  </div>
 );
}
