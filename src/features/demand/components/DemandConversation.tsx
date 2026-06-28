"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { validateDemandCompleteness } from "@/features/demand/services/validateDemandCompleteness";
import {
  PAX_MAX,
  isPastDate,
  isPaxBelowMin,
  isPaxOverMax,
  isReturnBeforeDeparture,
  isValidDateString,
} from "@/shared/lib/validation/leadValidators";
import type { DemandDraft } from "@/shared/types/lead";
import styles from "./demand.module.css";

type FieldWarning = { field: string; message: string; blocking: boolean };

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

const steps = ["Trajet", "Vérification", "Devis"];
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

const SESSION_CACHE_KEY = "neotravel:demand-session:v1";

type ChatExtracted = {
  departureCity: string | null;
  arrivalCity: string | null;
  departureDate: string | null;
  returnDate: string | null;
  passengerCount: number | null;
  tripType: "one_way" | "round_trip" | null;
};

type DemandSessionCache = {
  chatMessages: { role: "user" | "assistant"; content: string }[];
  currentLeadId: string | null;
  qualifiedLeadId: string | null;
  chatHumanReview: boolean;
  chatEmail: string | null;
  chatExtracted: ChatExtracted;
};

// Session persistence: survives refresh and client-side navigation, clears when the tab
// closes. Crucial for currentLeadId — without it a refresh orphans the Supabase lead and
// the next message would spawn a duplicate instead of enriching the existing one.
function readDemandSession(): DemandSessionCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemandSessionCache;
    if (!parsed || !Array.isArray(parsed.chatMessages) || !parsed.chatExtracted) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDemandSession(cache: DemandSessionCache) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage disabled or full — the session just won't persist, no crash.
  }
}

function clearDemandSession() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // ignore
  }
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

  // State declarations must come before useMemo that depend on them
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [mapZoom, setMapZoom] = useState(1);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);
  const [qualifiedLeadId, setQualifiedLeadId] = useState<string | null>(null);
  const [chatHumanReview, setChatHumanReview] = useState(false);
  const [chatEmail, setChatEmail] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatExtracted, setChatExtracted] = useState<ChatExtracted>({
    departureCity: null,
    arrivalCity: null,
    departureDate: null,
    returnDate: null,
    passengerCount: null,
    tripType: null,
  });

  // Hydrate a prior session on mount, then persist the meaningful slice on every change.
  // hydratedRef prevents the persist effect from overwriting the cache with empty initial
  // state before hydration runs (which would also avoid an SSR hydration mismatch).
  const hydratedRef = useRef(false);
  useEffect(() => {
    const cached = readDemandSession();
    if (cached) {
      setChatMessages(cached.chatMessages);
      setCurrentLeadId(cached.currentLeadId);
      setQualifiedLeadId(cached.qualifiedLeadId);
      setChatHumanReview(cached.chatHumanReview);
      setChatEmail(cached.chatEmail);
      setChatExtracted(cached.chatExtracted);
    }
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (chatMessages.length === 0 && !currentLeadId) return; // nothing worth persisting yet
    writeDemandSession({
      chatMessages,
      currentLeadId,
      qualifiedLeadId,
      chatHumanReview,
      chatEmail,
      chatExtracted,
    });
  }, [chatMessages, currentLeadId, qualifiedLeadId, chatHumanReview, chatEmail, chatExtracted]);

  // activeDemand: fusionne URL params + ce que le chat a extrait + éditions manuelles
  const activeDemand = useMemo(() => ({
    departureCity: chatExtracted.departureCity || demand.departure || null,
    arrivalCity: chatExtracted.arrivalCity || demand.arrival || null,
    departureDate: chatExtracted.departureDate || initialDemand.departureDate?.trim() || null,
    returnDate: chatExtracted.returnDate || initialDemand.returnDate?.trim() || null,
    passengerCount:
      chatExtracted.passengerCount ??
      (demand.passengers && Number.isFinite(Number(demand.passengers))
        ? Number(demand.passengers)
        : null),
    tripType: chatExtracted.tripType ?? (initialDemand.tripType === "one_way" ? "one_way" as const : initialDemand.tripType ? "round_trip" as const : null),
    options: demand.options,
  }), [chatExtracted, demand, initialDemand]);

  // Client-side validation mirrors the server (same shared validators) for instant
  // feedback on manual edits. The quote button is gated on these.
  const fieldWarnings = useMemo<FieldWarning[]>(() => {
    const list: FieldWarning[] = [];
    const { departureDate, returnDate, passengerCount } = activeDemand;
    if (departureDate && !isValidDateString(departureDate)) {
      list.push({ field: "departureDate", message: "Date de départ invalide.", blocking: true });
    } else if (isPastDate(departureDate)) {
      list.push({ field: "departureDate", message: "La date de départ est déjà passée.", blocking: true });
    }
    if (isReturnBeforeDeparture(departureDate, returnDate)) {
      list.push({ field: "returnDate", message: "Le retour est avant le départ.", blocking: true });
    }
    if (isPaxBelowMin(passengerCount)) {
      list.push({ field: "passengerCount", message: "Nombre de passagers invalide.", blocking: true });
    } else if (isPaxOverMax(passengerCount)) {
      list.push({
        field: "passengerCount",
        message: `Au-delà de ${PAX_MAX} passagers, un conseiller vous recontacte.`,
        blocking: true,
      });
    }
    return list;
  }, [activeDemand]);
  const hasBlockingWarning = fieldWarnings.some((w) => w.blocking);
  const warningFor = (field: string) => fieldWarnings.find((w) => w.field === field);

  const demandDraft = useMemo<DemandDraft>(
    () => ({
      rawMessage: undefined,
      organization: null,
      email: null,
      departureCity: activeDemand.departureCity,
      arrivalCity: activeDemand.arrivalCity,
      departureDate: activeDemand.departureDate,
      returnDate: initialDemand.returnDate?.trim() || null,
      passengerCount: activeDemand.passengerCount,
      tripType: activeDemand.tripType,
      options: activeDemand.options,
    }),
    [activeDemand, initialDemand.returnDate]
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
  const hasAnyDemand = Boolean(activeDemand.departureCity || activeDemand.arrivalCity || activeDemand.passengerCount || activeDemand.departureDate);
  const requiresHumanReview = hasAnyDemand && demoBlockingMissingFields.length > 0;

  // Quote readiness is decided form-side, from the side-panel fields — NOT from the AI's
  // qualification status. These are exactly the 5 fields the server needs to price.
  // returnDate and email are intentionally optional (server doesn't require them).
  const criticalLabels: Record<string, string> = {
    departureCity: "ville de départ",
    arrivalCity: "ville d'arrivée",
    departureDate: "date de départ",
    passengerCount: "nombre de passagers",
    tripType: "type de trajet (aller simple / aller-retour)",
  };
  const criticalMissing = (
    ["departureCity", "arrivalCity", "departureDate", "passengerCount", "tripType"] as const
  ).filter((key) => {
    const value = activeDemand[key];
    return value === null || value === undefined || value === "";
  });
  const formReady = criticalMissing.length === 0 && !hasBlockingWarning;
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routeLayersRef = useRef<LeafletLayer[]>([]);
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const mainStop = demand.intermediateStops[0];
  const demoOrganization = "Alpha Conseil";
  const demoEmail = "client@neotravel.fr";

  useEffect(() => {
    const container = chatMessagesRef.current;
    if (!container) return;

    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [chatMessages, isSending]);

  const hasActiveSession = chatMessages.length > 0 || Boolean(currentLeadId);

  function resetSession() {
    clearDemandSession();
    setChatMessages([]);
    setCurrentLeadId(null);
    setQualifiedLeadId(null);
    setChatHumanReview(false);
    setChatEmail(null);
    setChatExtracted({
      departureCity: null,
      arrivalCity: null,
      departureDate: null,
      returnDate: null,
      passengerCount: null,
      tripType: null,
    });
    setUserInput("");
    setWorkflowError(null);
  }

  async function sendMessage(e?: React.FormEvent) {
    e?.preventDefault();
    const text = userInput.trim();
    if (!text || isSending) return;

    const nextMessages = [...chatMessages, { role: "user" as const, content: text }];
    setChatMessages(nextMessages);
    setUserInput("");
    setIsSending(true);
    setWorkflowError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          ...(currentLeadId ? { leadId: currentLeadId } : {}),
        }),
      });
      const data = (await res.json()) as {
        status: string;
        message: string;
        leadId?: string;
        quoteId?: string;
        extractedFields?: {
          departureCity: string | null;
          arrivalCity: string | null;
          departureDate: string | null;
          returnDate: string | null;
          passengerCount: number | null;
          tripType: "one_way" | "round_trip" | null;
          email: string | null;
        };
      };

      if (data.leadId) setCurrentLeadId(data.leadId);
      if (data.status === "QUALIFIED" && data.leadId) setQualifiedLeadId(data.leadId);
      if (data.status === "HUMAN_REVIEW") setChatHumanReview(true);
      const ef = data.extractedFields;
      if (ef) {
        if (ef.email) setChatEmail(ef.email);
        setChatExtracted((prev) => ({
          departureCity: ef.departureCity ?? prev.departureCity,
          arrivalCity: ef.arrivalCity ?? prev.arrivalCity,
          departureDate: ef.departureDate ?? prev.departureDate,
          returnDate: ef.returnDate ?? prev.returnDate,
          passengerCount: ef.passengerCount ?? prev.passengerCount,
          tripType: ef.tripType ?? prev.tripType,
        }));
      }
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.message }]);

      if (data.status === "QUOTE_READY" && data.quoteId) {
        clearDemandSession();
        router.push(`/client/devis/${data.quoteId}`);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Desolé, une erreur est survenue. Veuillez réessayer." },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function generateClientQuote() {
    setWorkflowError(null);

    if (hasBlockingWarning) {
      setWorkflowError("Corrigez les informations signalées avant de demander un devis.");
      return;
    }

    if (!formReady) {
      const missing = criticalMissing.map((key) => criticalLabels[key]).join(", ");
      setWorkflowError(`Complétez le trajet pour recevoir votre devis : ${missing}.`);
      return;
    }

    // Chat / manual-edit path: persist the current (possibly corrected) state to the
    // lead, let the server re-validate, then quote only if it comes back QUALIFIED.
    if (currentLeadId) {
      setIsGeneratingQuote(true);
      try {
        const syncResponse = await fetch("/api/leads/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: currentLeadId,
            departureCity: activeDemand.departureCity,
            arrivalCity: activeDemand.arrivalCity,
            departureDate: activeDemand.departureDate,
            returnDate: activeDemand.tripType === "round_trip" ? activeDemand.returnDate : null,
            passengerCount: activeDemand.passengerCount,
            tripType: activeDemand.tripType,
            options: activeDemand.options,
          }),
        });
        const sync = (await syncResponse.json()) as {
          status: string;
          message: string;
          leadId?: string;
        };
        if (sync.status !== "QUALIFIED" || !sync.leadId) {
          setWorkflowError(sync.message || "Informations incomplètes pour générer le devis.");
          return;
        }

        const quoteResponse = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId: sync.leadId }),
        });
        if (!quoteResponse.ok) throw new Error("QUOTE_GENERATION_FAILED");
        const quote = (await quoteResponse.json()) as { id: string };
        clearDemandSession();
        router.push(`/client/devis/${quote.id}`);
      } catch {
        setWorkflowError("Generation du devis impossible. Contactez-nous via le formulaire.");
      } finally {
        setIsGeneratingQuote(false);
      }
      return;
    }

    // Fallback: URL-param flow (pre-filled demand from homepage form). With no lead yet,
    // we need the homepage pre-fill to create one.
    if (!hasInitialDemand) {
      setWorkflowError("Décrivez votre trajet dans le chat pour démarrer votre demande.");
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
          qualify: true,
        }),
      });

      if (!leadResponse.ok) throw new Error("LEAD_CREATION_FAILED");
      const leadPayload = (await leadResponse.json()) as {
        leadId: string;
        qualification?: { status: string; missingFields?: string[]; humanReviewReason?: string | null };
      };

      if (leadPayload.qualification?.status === "HUMAN_REVIEW") {
        setWorkflowError(
          leadPayload.qualification.humanReviewReason ??
            "La demande passe en reprise humaine avant generation du devis.",
        );
        return;
      }
      if (leadPayload.qualification?.status === "INCOMPLETE") {
        setWorkflowError(`Informations manquantes : ${(leadPayload.qualification.missingFields ?? []).join(", ")}.`);
        return;
      }

      const quoteResponse = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: leadPayload.leadId }),
      });

      if (!quoteResponse.ok) throw new Error("QUOTE_GENERATION_FAILED");
      const quote = (await quoteResponse.json()) as { id: string };
      clearDemandSession();
      router.push(`/client/devis/${quote.id}`);
    } catch {
      setWorkflowError("Generation du devis impossible. Reprise humaine possible via contact.");
    } finally {
      setIsGeneratingQuote(false);
    }
  }

  useEffect(() => {
    if (!activeDemand.departureCity || !activeDemand.arrivalCity) {
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
            departure: activeDemand.departureCity,
            arrival: activeDemand.arrivalCity,
            intermediateStops: demand.intermediateStops,
          }),
          signal: controller.signal,
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
  }, [activeDemand.departureCity, activeDemand.arrivalCity, demand.intermediateStops]);

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
          <Image className={styles.logoImage} src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>

        <nav className={styles.nav} aria-label="Navigation principale">
          <Link href="/#estimation">Estimation</Link>
          <Link href="/#projets">Vos projets</Link>
          <Link href="/partenaires">Partenaires</Link>
          <Link href="/#engagements">Engagements</Link>
        </nav>

      </header>

      <section className={styles.hero}>
        <div>
          <h1>Qualification conversationnelle</h1>
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
        <strong>Progression de la demande prospect</strong>
        <ol className={styles.progress}>
          {steps.map((step, index) => {
            // Derived from state only — never from a front-side route lookup.
            const trajetDone = (["departureCity", "arrivalCity", "departureDate", "passengerCount", "tripType"] as const).every(
              (k) => demandDraft[k] != null
            );
            const verificationDone = trajetDone && !hasBlockingWarning && Boolean(qualifiedLeadId);
            const stepDone = [trajetDone, verificationDone, false];
            const firstIncomplete = stepDone.findIndex((d) => !d);
            const cls = stepDone[index]
              ? styles.doneStep
              : index === firstIncomplete
                ? styles.currentStep
                : styles.nextStep;
            return (
              <li key={step} className={cls}>
                <span>{index + 1}</span>
                {step}
              </li>
            );
          })}
        </ol>
      </section>

      <div className={styles.layout}>
        <section className={styles.chatCard} aria-labelledby="conversation-title">
          <div className={styles.chatCardHeader}>
            <h2 id="conversation-title">Conversation</h2>
            {hasActiveSession ? (
              <button type="button" className={styles.resetButton} onClick={resetSession}>
                Nouvelle demande
              </button>
            ) : null}
          </div>
          <div ref={chatMessagesRef} className={styles.chatMessages}>
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
                  <strong>NeoTravel IA</strong>
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
                <strong>NeoTravel IA</strong>
                <p>Bonjour, comment puis-je vous aider a organiser votre trajet de groupe ?</p>
              </div>
            )}
            <div className={`${styles.message} ${styles.assistant}`}>
              <strong>NeoTravel IA</strong>
              <p>
                {hasInitialDemand && missingFields.length
                  ? requiresHumanReview
                    ? `Merci. Il manque encore : ${demoBlockingMissingFields.join(", ")}. Le dossier passe en reprise humaine.`
                    : "Merci, les informations trajet sont suffisantes. Je vous demanderai les coordonnées client avant l'envoi."
                  : hasInitialDemand
                    ? "Merci, les informations principales sont complètes pour preparer le devis."
                    : "Indiquez simplement votre depart, votre arrivée, la date et le nombre de passagers."}
              </p>
            </div>
            {chatMessages.map((msg, i) => (
              <div key={i} className={`${styles.message} ${msg.role === "user" ? styles.prospect : styles.assistant}`}>
                <strong>{msg.role === "user" ? "Vous" : "NeoTravel IA"}</strong>
                <p>{msg.content}</p>
              </div>
            ))}
            {isSending && (
              <div className={styles.thinkingBubble} aria-label="NeoTravel IA réfléchit">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <form className={styles.composer} onSubmit={sendMessage}>
            <label className={styles.srOnly} htmlFor="demand-message">
              Preciser heure, organisation, commentaire
            </label>
            <textarea
              id="demand-message"
              name="message"
              placeholder="Preciser heure, organisation, commentaire..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              disabled={isSending}
            />
          </form>
          <div className={styles.chatActions}>
            {chatHumanReview ? (
              <Link className={styles.humanReviewButton} href="/contact">
                Transmettre a un conseiller
              </Link>
            ) : userInput.trim() ? (
              <button
                className={styles.sendButton}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage()}
              >
                {isSending ? "Envoi en cours…" : "Envoyer mon message"}
              </button>
            ) : (
              <button
                className={styles.primaryButton}
                type="button"
                disabled={isGeneratingQuote || !formReady}
                onClick={() => void generateClientQuote()}
              >
                {isGeneratingQuote ? "Création du devis…" : "Recevoir mon devis"}
              </button>
            )}
          </div>
          {hasBlockingWarning ? (
            <p className={styles.workflowError}>{fieldWarnings.find((w) => w.blocking)?.message}</p>
          ) : !formReady && hasAnyDemand ? (
            <p className={styles.workflowHint}>
              Encore besoin de : {criticalMissing.map((key) => criticalLabels[key]).join(", ")}.
            </p>
          ) : formReady ? (
            <p className={styles.workflowReady}>Trajet complet — vous pouvez recevoir votre devis.</p>
          ) : null}
          {workflowError ? <p className={styles.workflowError}>{workflowError}</p> : null}
        </section>

        <div className={styles.sideStack}>
          <aside className={styles.sidePanel} id="infos">
            <div className={styles.sidePanelHeader}>
              <h2>Trajet et options</h2>
              <span className={qualifiedLeadId ? styles.readyStatus : hasAnyDemand && demoBlockingMissingFields.length === 0 ? styles.readyStatus : requiresHumanReview ? styles.reviewStatus : styles.pendingStatus}>
                {qualifiedLeadId ? "Pret pour devis" : hasAnyDemand && demoBlockingMissingFields.length === 0 ? "Complet" : requiresHumanReview ? "Infos manquantes" : "En attente"}
              </span>
            </div>

            <div className={styles.manualForm}>
              <p className={styles.manualFormTitle}>Trajet — modifiable à tout moment</p>
              <div className={styles.manualFields}>
                <label>
                  <span>Départ</span>
                  <input
                    type="text"
                    placeholder="ex: Paris"
                    value={activeDemand.departureCity ?? ""}
                    onChange={(e) =>
                      setChatExtracted((p) => ({ ...p, departureCity: e.target.value.trim() ? e.target.value : null }))
                    }
                  />
                </label>
                <label>
                  <span>Arrivée</span>
                  <input
                    type="text"
                    placeholder="ex: Lyon"
                    value={activeDemand.arrivalCity ?? ""}
                    onChange={(e) =>
                      setChatExtracted((p) => ({ ...p, arrivalCity: e.target.value.trim() ? e.target.value : null }))
                    }
                  />
                </label>
                <label className={warningFor("departureDate") ? styles.fieldInvalid : undefined}>
                  <span>Date de départ</span>
                  <input
                    type="date"
                    value={activeDemand.departureDate ?? ""}
                    onChange={(e) =>
                      setChatExtracted((p) => ({ ...p, departureDate: e.target.value || null }))
                    }
                  />
                  {warningFor("departureDate") ? (
                    <small className={styles.fieldWarning}>{warningFor("departureDate")!.message}</small>
                  ) : null}
                </label>
                <label>
                  <span>Type</span>
                  <select
                    value={activeDemand.tripType ?? ""}
                    onChange={(e) =>
                      setChatExtracted((p) => ({
                        ...p,
                        tripType: e.target.value ? (e.target.value as "one_way" | "round_trip") : null,
                      }))
                    }
                  >
                    <option value="">--</option>
                    <option value="one_way">Aller simple</option>
                    <option value="round_trip">Aller-retour</option>
                  </select>
                </label>
                {activeDemand.tripType === "round_trip" ? (
                  <label className={warningFor("returnDate") ? styles.fieldInvalid : undefined}>
                    <span>Date de retour facultative</span>
                    <input
                      type="date"
                      value={activeDemand.returnDate ?? ""}
                      onChange={(e) =>
                        setChatExtracted((p) => ({ ...p, returnDate: e.target.value || null }))
                      }
                    />
                    {warningFor("returnDate") ? (
                      <small className={styles.fieldWarning}>{warningFor("returnDate")!.message}</small>
                    ) : null}
                  </label>
                ) : null}
                <label className={warningFor("passengerCount") ? styles.fieldInvalid : undefined}>
                  <span>Passagers</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    placeholder="ex: 45"
                    value={activeDemand.passengerCount ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setChatExtracted((p) => ({ ...p, passengerCount: raw === "" ? null : Number(raw) }));
                    }}
                  />
                  {warningFor("passengerCount") ? (
                    <small className={styles.fieldWarning}>{warningFor("passengerCount")!.message}</small>
                  ) : null}
                </label>
                <div className={styles.manualOptionsLine}>
                  <span>Options</span>
                  <strong>{activeDemand.options.join(", ") || "Aucune"}</strong>
                </div>
                <label className={qualifiedLeadId && !chatEmail && !hasInitialDemand ? styles.fieldInvalid : undefined}>
                  <span>Email de contact {qualifiedLeadId && !hasInitialDemand ? <strong aria-hidden="true"> *</strong> : null}</span>
                  <input
                    type="email"
                    placeholder="votre@email.fr"
                    value={chatEmail ?? ""}
                    onChange={(e) => setChatEmail(e.target.value.trim() || null)}
                  />
                  {qualifiedLeadId && !chatEmail && !hasInitialDemand ? (
                    <small className={styles.fieldWarning}>Requis pour recevoir le devis.</small>
                  ) : null}
                </label>
              </div>
            </div>
          </aside>

          <aside className={styles.routePreview} aria-labelledby="route-preview-title">
            <div className={styles.routeHeader}>
              <div>
                <p>Apercu trajet</p>
                <h2 id="route-preview-title">
                  {activeDemand.departureCity && activeDemand.arrivalCity
                    ? `${activeDemand.departureCity} vers ${activeDemand.arrivalCity}`
                    : "Trajet en attente"}
                </h2>
              </div>
              <span>{routePreview ? `${routePreview.distanceKm} km` : routeStatus === "loading" ? "Calcul..." : "A confirmer"}</span>
            </div>

            {activeDemand.departureCity && activeDemand.arrivalCity ? (
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
              <div className={styles.routeEmptyState}>
                Le trajet s&apos;affichera ici après les premières informations donnees au chat.
              </div>
            )}

            <dl className={styles.routeFacts}>
              <div>
                <dt>Départ</dt>
                <dd>
                  {activeDemand.departureCity || "En attente"}
                  {activeDemand.departureDate ? ` - ${formatDate(activeDemand.departureDate)}` : ""}
                </dd>
              </div>
              {mainStop ? (
                <div>
                  <dt>Étape</dt>
                  <dd>Pause intermediaire à {mainStop}</dd>
                </div>
              ) : null}
              <div>
                <dt>Arrivée</dt>
                <dd>
                  {activeDemand.arrivalCity || "En attente"}
                  {activeDemand.tripType === "round_trip" && demand.returnDate
                    ? ` - retour le ${demand.returnDate}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt>Durée</dt>
                <dd>{formatDuration(routePreview?.durationMinutes)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </div>
    </main>
  );
}
