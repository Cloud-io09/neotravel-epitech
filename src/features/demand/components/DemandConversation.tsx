"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { validateDemandCompleteness } from "@/features/demand/services/validateDemandCompleteness";
import { AccessibilityWidget } from "@/shared/accessibility/AccessibilityWidget";
import { LanguageSelector } from "@/shared/i18n/LanguageSelector";
import type { DemandDraft } from "@/shared/types/lead";
import styles from "./demand.module.css";

type InitialDemand = {
 departure?: string;
 arrival?: string;
 departureDate?: string;
 returnDate?: string;
 passengers?: string;
 tripType?: string;
 options?: string;
 intermediateStops?: string;
 callback?: string;
};

type RoutePreview = {
 distanceKm: number;
 durationMinutes: number;
 labels: string[];
 geometry: [number, number][];
 bbox?: [number, number, number, number];
};

type LeafletLayer = {
 addTo: (target: LeafletMap) => LeafletLayer;
 remove: () => void;
};

type LeafletPolyline = LeafletLayer & {
 getBounds: () => unknown;
};

type LeafletMap = {
 fitBounds: (bounds: unknown, options?: { padding?: [number, number]; maxZoom?: number }) => void;
 getZoom: () => number;
 invalidateSize: () => void;
 remove: () => void;
 setZoom: (zoom: number) => void;
};

type LeafletNamespace = {
 circleMarker: (
  coordinates: [number, number],
  options: Record<string, string | number | boolean>
 ) => LeafletLayer;
 map: (
  element: HTMLElement,
  options?: { attributionControl?: boolean; scrollWheelZoom?: boolean; zoomControl?: boolean }
 ) => LeafletMap;
 polyline: (coordinates: [number, number][], options: Record<string, string | number>) => LeafletPolyline;
 tileLayer: (url: string, options?: Record<string, string | number>) => LeafletLayer;
};

declare global {
 interface Window {
  L?: LeafletNamespace;
  neoTravelLeafletLoader?: Promise<LeafletNamespace>;
 }
}

const steps = ["Trajet", "Options", "Coordonnees", "Devis"];
const missingFieldLabels: Partial<Record<keyof DemandDraft, string>> = {
 organization: "Nom de l'organisation",
 email: "Email de contact",
 departureCity: "Ville de depart",
 arrivalCity: "Ville d'arrivee",
 departureDate: "Date de depart",
 returnDate: "Date de retour",
 passengerCount: "Nombre de passagers",
 tripType: "Type de trajet"
};

const translatableDetectedValues = new Set(["Aucune", "En attente", "Non", "Oui"]);

function clean(value: string | undefined, fallback = "") {
 const trimmed = value?.trim();
 return trimmed ? trimmed : fallback;
}

function splitValues(value: string | undefined) {
 return (value ?? "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
}

function formatDate(value: string | undefined, fallback = "") {
 if (!value) return fallback;
 const date = new Date(`${value}T12:00:00`);
 if (Number.isNaN(date.getTime())) return fallback;

 return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatDuration(minutes: number | null | undefined) {
 if (!minutes) return "Duree a confirmer";
 const hours = Math.floor(minutes / 60);
 const rest = minutes % 60;
 if (!hours) return `${rest} min`;

 return `${hours} h ${String(rest).padStart(2, "0")}`;
}

function loadLeaflet() {
 if (window.L) return Promise.resolve(window.L);
 if (window.neoTravelLeafletLoader) return window.neoTravelLeafletLoader;

 window.neoTravelLeafletLoader = new Promise((resolve, reject) => {
  if (!document.querySelector('link[data-neotravel-leaflet="true"]')) {
   const link = document.createElement("link");
   link.dataset.neotravelLeaflet = "true";
   link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
   link.rel = "stylesheet";
   document.head.appendChild(link);
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  script.onload = () => (window.L ? resolve(window.L) : reject(new Error("LEAFLET_UNAVAILABLE")));
  script.onerror = () => reject(new Error("LEAFLET_LOAD_FAILED"));
  document.body.appendChild(script);
 });

 return window.neoTravelLeafletLoader;
}

export function DemandConversation({ initialDemand = {} }: { initialDemand?: InitialDemand }) {
 const router = useRouter();
 const hasInitialDemand = Boolean(
  initialDemand.departure?.trim() ||
   initialDemand.arrival?.trim() ||
   initialDemand.departureDate?.trim() ||
   initialDemand.passengers?.trim() ||
   initialDemand.options?.trim() ||
   initialDemand.intermediateStops?.trim()
 );
 const demand = useMemo(() => {
  const intermediateStops = splitValues(initialDemand.intermediateStops);
  const options = splitValues(initialDemand.options);
  const departure = clean(initialDemand.departure);
  const arrival = clean(initialDemand.arrival);
  const departureDate = formatDate(initialDemand.departureDate);
  const returnDate = formatDate(initialDemand.returnDate);
  const tripType = initialDemand.tripType === "one_way" ? "Aller simple" : "Aller-retour";

  return {
   departure,
   arrival,
   departureDate,
   returnDate,
   passengers: clean(initialDemand.passengers),
   tripType,
   options,
   intermediateStops,
   callbackWanted: initialDemand.callback === "no" ? "Non" : "Oui"
  };
 }, [initialDemand]);
 const demandDraft = useMemo<DemandDraft>(
  () => ({
   rawMessage: undefined,
   organization: null,
   email: null,
   departureCity: demand.departure || null,
   arrivalCity: demand.arrival || null,
   departureDate: initialDemand.departureDate?.trim() || null,
   returnDate: initialDemand.returnDate?.trim() || null,
   passengerCount: Number.isFinite(Number(demand.passengers)) ? Number(demand.passengers) : null,
   tripType: hasInitialDemand ? (initialDemand.tripType === "one_way" ? "one_way" : "round_trip") : null,
   options: demand.options
  }),
  [demand, hasInitialDemand, initialDemand.departureDate, initialDemand.returnDate, initialDemand.tripType]
 );
 const missingFields = useMemo(
  () =>
   validateDemandCompleteness(demandDraft).missingFields.map(
    (field) => missingFieldLabels[field] ?? String(field)
   ),
  [demandDraft]
 );
 const demoBlockingMissingFields = missingFields.filter(
  (field) => field !== missingFieldLabels.organization && field !== missingFieldLabels.email
 );
 const requiresHumanReview = hasInitialDemand && demoBlockingMissingFields.length > 0;
 const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
 const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
 const [mapZoom, setMapZoom] = useState(1);
 const [isMapExpanded, setIsMapExpanded] = useState(false);
 const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
 const [workflowError, setWorkflowError] = useState<string | null>(null);
 const mapContainerRef = useRef<HTMLDivElement | null>(null);
 const mapRef = useRef<LeafletMap | null>(null);
 const routeLayersRef = useRef<LeafletLayer[]>([]);
 const mainStop = demand.intermediateStops[0];
 const detected = [
  ["Depart", demand.departure || "En attente"],
  ["Arrivee", demand.arrival || "En attente"],
  ["Date", demand.departureDate || "En attente"],
  ["Retour", hasInitialDemand && demand.tripType === "Aller-retour" ? demand.returnDate || "En attente" : "Non"],
  ["Passagers", demand.passengers || "En attente"],
  ["Type", hasInitialDemand ? demand.tripType : "En attente"],
  ["Options", demand.options.join(", ") || "Aucune"]
 ];
 const demoOrganization = "Alpha Conseil";
 const demoEmail = "client@neotravel.fr";

 async function generateClientQuote() {
  setWorkflowError(null);

  if (!hasInitialDemand || demoBlockingMissingFields.length > 0) {
   setWorkflowError("Le chat doit d'abord qualifier le trajet avant de generer le devis.");
   return;
  }

  if (!demoOrganization.trim() || !demoEmail.trim()) {
   setWorkflowError("Renseignez l'organisation et l'email pour creer le compte client.");
   return;
  }

  setIsGeneratingQuote(true);
  try {
   const leadResponse = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
     rawMessage: `Demande client ${demoOrganization} ${demoEmail} : ${demand.departure} vers ${demand.arrival}`,
     organization: demoOrganization,
     email: demoEmail,
     departureCity: demand.departure,
     arrivalCity: demand.arrival,
     departureDate: initialDemand.departureDate?.trim() || null,
     returnDate: initialDemand.tripType === "one_way" ? null : initialDemand.returnDate?.trim() || null,
     passengerCount: Number.isFinite(Number(demand.passengers)) ? Number(demand.passengers) : null,
     tripType: initialDemand.tripType === "one_way" ? "one_way" : "round_trip",
     options: demand.options,
     qualify: true
    })
   });

   if (!leadResponse.ok) throw new Error("LEAD_CREATION_FAILED");
   const leadPayload = (await leadResponse.json()) as {
    leadId: string;
    qualification?: { status: string; missingFields?: string[]; humanReviewReason?: string | null };
   };

   if (leadPayload.qualification?.status === "HUMAN_REVIEW") {
    setWorkflowError(
     leadPayload.qualification.humanReviewReason ??
      "La demande passe en reprise humaine avant generation du devis."
    );
    return;
   }

   if (leadPayload.qualification?.status === "INCOMPLETE") {
    setWorkflowError(
     `Informations manquantes : ${(leadPayload.qualification.missingFields ?? []).join(", ")}.`
    );
    return;
   }

   const quoteResponse = await fetch("/api/quotes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ leadId: leadPayload.leadId })
   });

   if (!quoteResponse.ok) throw new Error("QUOTE_GENERATION_FAILED");
   const quote = (await quoteResponse.json()) as { id: string };
   router.push(`/devis/${quote.id}`);
  } catch {
   setWorkflowError("Generation du devis impossible. Reprise humaine possible via contact.");
  } finally {
   setIsGeneratingQuote(false);
  }
 }

 useEffect(() => {
  if (!hasInitialDemand || !demand.departure || !demand.arrival) {
   setRoutePreview(null);
   setRouteStatus("idle");
   return;
  }

  const controller = new AbortController();

  async function loadRoutePreview() {
   setRouteStatus("loading");
   try {
    const response = await fetch("/api/routes/preview", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
      departure: demand.departure,
      arrival: demand.arrival,
      intermediateStops: demand.intermediateStops
     }),
     signal: controller.signal
    });

    if (!response.ok) throw new Error("ROUTE_PREVIEW_FAILED");
    const payload = (await response.json()) as RoutePreview;
    setRoutePreview(payload);
    setRouteStatus("ready");
   } catch {
    if (!controller.signal.aborted) setRouteStatus("fallback");
   }
  }

  loadRoutePreview();

  return () => controller.abort();
 }, [demand, hasInitialDemand]);

 useEffect(() => {
  if (!routePreview?.geometry.length || !mapContainerRef.current) return;
  let cancelled = false;

  loadLeaflet()
   .then((leaflet) => {
    if (cancelled || !mapContainerRef.current) return;
    const coordinates = routePreview.geometry.map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];

    if (!mapRef.current) {
     mapRef.current = leaflet.map(mapContainerRef.current, {
      attributionControl: true,
      scrollWheelZoom: false,
      zoomControl: false
     });
     leaflet
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
       attribution: "© OpenStreetMap"
      })
      .addTo(mapRef.current);
    }

    routeLayersRef.current.forEach((layer) => layer.remove());
    const routeLine = leaflet.polyline(coordinates, {
      color: "#d69b2d",
      opacity: 0.96,
      weight: 6
     });
    routeLine.addTo(mapRef.current);
    const startMarker = leaflet
     .circleMarker(start, {
      color: "#ffffff",
      fillColor: "#123885",
      fillOpacity: 1,
      radius: 7,
      weight: 4
     })
     .addTo(mapRef.current);
    const endMarker = leaflet
     .circleMarker(end, {
      color: "#ffffff",
      fillColor: "#d51b29",
      fillOpacity: 1,
      radius: 7,
      weight: 4
     })
     .addTo(mapRef.current);

    routeLayersRef.current = [routeLine, startMarker, endMarker];
    mapRef.current.fitBounds(routeLine.getBounds(), { padding: [22, 22], maxZoom: 13 });
    mapRef.current.setZoom(Math.min(13, Math.max(5, mapRef.current.getZoom() + mapZoom - 1)));
    window.setTimeout(() => mapRef.current?.invalidateSize(), 60);
   })
   .catch(() => setRouteStatus("fallback"));

  return () => {
   cancelled = true;
  };
 }, [isMapExpanded, mapZoom, routePreview]);

 useEffect(() => {
  return () => {
   mapRef.current?.remove();
   mapRef.current = null;
  };
 }, []);

 return (
  <main className={styles.page}>
   <header className={styles.topbar}>
    <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
     <Image className={styles.logoImage} src="/logo-neotravel.svg" alt="" width={250} height={72} priority />
    </Link>

    <div className={styles.headerActions}>
     <nav className={styles.nav} aria-label="Navigation principale">
      <Link href="/#estimation">Estimation</Link>
      <Link href="/#projets">Vos projets</Link>
      <Link href="/partenaires">Partenaires</Link>
      <Link href="/#engagements">Engagements</Link>
     </nav>
     <LanguageSelector />
     <AccessibilityWidget />
    </div>

   </header>

   <section className={styles.hero}>
    <div>
     <h1 data-i18n-key="Qualification conversationnelle">Qualification conversationnelle</h1>
     <p>
      Decrivez votre trajet, vos dates et vos options : NeoTravel vous accompagne jusqu&apos;a une demande claire et
      exploitable.
     </p>
    </div>
    <Link className={styles.heroCallButton} href="/contact">
     Nous contacter
    </Link>
   </section>

   <section className={styles.progressCard} aria-label="Progression de la demande prospect">
    <strong data-i18n-key="Progression de la demande prospect">Progression de la demande prospect</strong>
    <ol className={styles.progress}>
     {steps.map((step, index) => (
      <li key={step} className={index < 2 ? styles.doneStep : index === 2 ? styles.currentStep : styles.nextStep}>
       <span>{index + 1}</span>
       <em data-i18n-key={step}>{step}</em>
      </li>
     ))}
    </ol>
   </section>

   <div className={styles.layout}>
    <section className={styles.chatCard} aria-labelledby="conversation-title">
     <h2 id="conversation-title" className={styles.srOnly}>
      Conversation
     </h2>
     <div className={styles.chatMessages}>
      {hasInitialDemand ? (
       <>
        <div className={`${styles.message} ${styles.prospect}`}>
         <strong>Vous</strong>
         <p>
          Bonjour, nous devons transporter {demand.passengers} personnes de {demand.departure} a{" "}
          {demand.arrival} le {demand.departureDate.toLowerCase()}
          {demand.tripType === "Aller-retour" ? `, retour le ${demand.returnDate.toLowerCase()}` : ""}.
         </p>
        </div>
        <div className={`${styles.message} ${styles.assistant}`}>
         <strong data-i18n-key="NeoTravel IA">NeoTravel IA</strong>
         <p>
          Parfait. Je detecte {demand.departure} - {demand.arrival}, {demand.passengers} passagers,{" "}
          {demand.tripType.toLowerCase()}. Souhaitez-vous confirmer les horaires et l&apos;organisation ?
         </p>
        </div>
        <div className={`${styles.message} ${styles.prospect}`}>
         <strong>Vous</strong>
         <p>
          {mainStop ? `Une etape a ${mainStop}. ` : ""}
          Options demandees : {demand.options.join(", ") || "aucune option particuliere"}.
         </p>
        </div>
       </>
      ) : (
       <div className={`${styles.message} ${styles.assistant}`}>
        <strong data-i18n-key="NeoTravel IA">NeoTravel IA</strong>
        <p>Bonjour, comment puis-je vous aider a organiser votre trajet de groupe ?</p>
       </div>
      )}
      <div className={`${styles.message} ${styles.assistant}`}>
       <strong data-i18n-key="NeoTravel IA">NeoTravel IA</strong>
       <p>
        {hasInitialDemand && missingFields.length
         ? requiresHumanReview
          ? `Merci. Il manque encore : ${demoBlockingMissingFields.join(", ")}. Le dossier passe en reprise humaine.`
          : "Merci, les informations trajet sont suffisantes. Je vous demanderai les coordonnees client avant l'envoi."
         : hasInitialDemand
          ? "Merci, les informations principales sont completes pour preparer le devis."
          : "Indiquez simplement votre depart, votre arrivee, la date et le nombre de passagers."}
       </p>
      </div>
     </div>

     <form className={styles.composer}>
      <label className={styles.srOnly} htmlFor="demand-message">
       Preciser heure, organisation, commentaire
      </label>
      <textarea
       id="demand-message"
       name="message"
       placeholder="Preciser heure, organisation, commentaire..."
      />
     </form>
     <div className={styles.chatActions}>
      {requiresHumanReview ? (
       <Link className={styles.humanReviewButton} href="/contact">
        Transmettre a un conseiller
       </Link>
      ) : (
       <button
        className={styles.primaryButton}
        type="button"
        disabled={isGeneratingQuote || !hasInitialDemand}
        onClick={generateClientQuote}
       >
        {isGeneratingQuote
         ? "Creation du devis..."
         : hasInitialDemand
          ? "Recevoir mon devis"
          : "Demarrer avec le chat"}
       </button>
      )}
     </div>
     {workflowError ? <p className={styles.workflowError}>{workflowError}</p> : null}
    </section>

    <div className={styles.sideStack}>
     <aside className={styles.sidePanel} id="infos">
      <div className={styles.sidePanelHeader}>
       <h2>Trajet detaille et options</h2>
       <span className={requiresHumanReview ? styles.reviewStatus : styles.readyStatus}>
        {requiresHumanReview ? "Reprise humaine" : hasInitialDemand ? "Automatique possible" : "En attente"}
       </span>
      </div>

      <ul className={styles.detectedList}>
       {detected.map(([label, value]) => (
        <li key={label}>
         <span data-i18n-key={label}>{label}</span>
         <strong data-i18n-key={translatableDetectedValues.has(value) ? value : undefined}>{value}</strong>
        </li>
       ))}
      </ul>

     </aside>

     <aside className={styles.routePreview} aria-labelledby="route-preview-title">
      <div className={styles.routeHeader}>
       <div>
        <p data-i18n-key="Apercu trajet">Apercu trajet</p>
        <h2 id="route-preview-title">
         {hasInitialDemand && demand.departure && demand.arrival
          ? `${demand.departure} vers ${demand.arrival}`
          : <span data-i18n-key="Trajet en attente">Trajet en attente</span>}
        </h2>
       </div>
       <span>
        {routePreview ? (
         `${routePreview.distanceKm} km`
        ) : routeStatus === "loading" ? (
         <span data-i18n-key="Calcul...">Calcul...</span>
        ) : (
         <span data-i18n-key="A confirmer">A confirmer</span>
        )}
       </span>
      </div>

      {hasInitialDemand && demand.departure && demand.arrival ? (
       <div className={isMapExpanded ? `${styles.mapBox} ${styles.mapBoxExpanded}` : styles.mapBox} aria-label="Carte du trajet calcule">
        <div className={styles.mapControls} aria-label="Controle carte">
         <button type="button" onClick={() => setMapZoom((current) => Math.min(3, current + 1))}>
          +
         </button>
         <button type="button" onClick={() => setMapZoom((current) => Math.max(1, current - 1))}>
          -
         </button>
         <button type="button" onClick={() => setIsMapExpanded((current) => !current)}>
          {isMapExpanded ? "Reduire" : "Agrandir"}
         </button>
        </div>
        <div className={styles.leafletMap} ref={mapContainerRef} />
        {routeStatus === "fallback" ? <span className={styles.mapLine} /> : null}
       </div>
      ) : (
       <div
        className={styles.routeEmptyState}
        data-i18n-key="Le trajet s'affichera ici apres les premieres informations donnees au chat."
       >
        Le trajet s&apos;affichera ici apres les premieres informations donnees au chat.
       </div>
      )}

      <dl className={styles.routeFacts}>
       <div>
        <dt data-i18n-key="Depart">Depart</dt>
        <dd>
         {demand.departure || <span data-i18n-key="En attente">En attente</span>}
         {demand.departureDate ? ` - ${demand.departureDate}` : ""}
        </dd>
       </div>
       {mainStop ? (
        <div>
         <dt data-i18n-key="Etape">Etape</dt>
         <dd>Pause intermediaire a {mainStop}</dd>
        </div>
       ) : null}
       <div>
        <dt data-i18n-key="Arrivee">Arrivee</dt>
        <dd>
         {demand.arrival || <span data-i18n-key="En attente">En attente</span>}
         {hasInitialDemand && demand.tripType === "Aller-retour" && demand.returnDate
          ? ` - retour le ${demand.returnDate}`
          : ""}
        </dd>
       </div>
       <div>
        <dt data-i18n-key="Duree">Duree</dt>
        <dd>
         {routePreview?.durationMinutes ? (
          formatDuration(routePreview.durationMinutes)
         ) : (
          <span data-i18n-key="Duree a confirmer">Duree a confirmer</span>
         )}
        </dd>
       </div>
      </dl>
     </aside>
    </div>
   </div>
  </main>
 );
}
