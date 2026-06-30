"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Pencil } from "lucide-react";
import type { Lead } from "@/shared/types/lead";
import { humanReviewReasonText } from "@/features/human-review/reasonLabels";
import { getStatusDisplay } from "@/shared/lib/status/statusDisplay";
import styles from "./leadEdit.module.css";

const STATUS_OPTIONS = [
 "NEW",
 "INCOMPLETE",
 "QUALIFIED",
 "HIGH_VALUE",
 "HUMAN_REVIEW",
 "WON",
 "LOST",
 "CLOSED"
];

const OPTION_CHOICES = [
 { code: "guide", label: "Guide / accompagnateur" },
 { code: "driver_overnight", label: "Nuit chauffeur" }
];

const OPTION_ALIASES = new Map<string, string>([
 ["guide", "guide"],
 ["accompagnateur", "guide"],
 ["driver_overnight", "driver_overnight"],
 ["driverovernight", "driver_overnight"],
 ["nuit chauffeur", "driver_overnight"],
 ["nuit_chauffeur", "driver_overnight"]
]);

type SaveState = { status: "idle" | "saving" | "saved" | "error"; message?: string };

function normalizeOptions(options: string[]) {
 return [
  ...new Set(
   options
    .map((option) => {
     const trimmed = option.trim();
     return OPTION_ALIASES.get(trimmed.toLocaleLowerCase("fr-FR")) ?? trimmed;
    })
    .filter(Boolean)
  )
 ];
}

export function LeadEditForm({ lead }: { lead: Lead }) {
 const router = useRouter();
 const isReview = lead.status === "HUMAN_REVIEW";

 const [form, setForm] = useState({
  clientType: lead.clientType ?? "",
  contactName: lead.contactName ?? "",
  organization: lead.organization ?? "",
  email: lead.email ?? "",
  phone: lead.phone ?? "",
  departureCity: lead.departureCity ?? "",
  arrivalCity: lead.arrivalCity ?? "",
  departureDate: lead.departureDate ?? "",
  returnDate: lead.returnDate ?? "",
  passengerCount: lead.passengerCount != null ? String(lead.passengerCount) : "",
  tripType: lead.tripType ?? "",
  hasIntermediateStop: Boolean(lead.hasIntermediateStop),
  intermediateStops: (lead.intermediateStops ?? []).join(", "),
  options: normalizeOptions(lead.options),
  status: lead.status as string,
  humanReviewReason: humanReviewReasonText(lead.humanReviewReason)
 });
 const [state, setState] = useState<SaveState>({ status: "idle" });
 const statusOptions = (STATUS_OPTIONS as readonly string[]).includes(form.status)
  ? STATUS_OPTIONS
  : [form.status, ...STATUS_OPTIONS];

 function set(key: keyof typeof form, value: string) {
  setForm((prev) => ({ ...prev, [key]: value }));
  setState({ status: "idle" });
 }

 function setTripType(value: string) {
  setForm((prev) => ({ ...prev, tripType: value }));
  setState({ status: "idle" });
 }

 function toggleIntermediateStop(checked: boolean) {
  setForm((prev) => ({
   ...prev,
   hasIntermediateStop: checked,
   intermediateStops: checked ? prev.intermediateStops : ""
  }));
  setState({ status: "idle" });
 }

 function toggleOption(code: string) {
  setForm((prev) => {
   const nextOptions = prev.options.includes(code)
    ? prev.options.filter((option) => option !== code)
    : [...prev.options, code];
   return { ...prev, options: normalizeOptions(nextOptions) };
  });
  setState({ status: "idle" });
 }

 async function handleSubmit(event: FormEvent) {
  event.preventDefault();
  setState({ status: "saving" });

  const patch = {
   clientType: form.clientType.trim() || null,
   contactName: form.contactName.trim() || null,
   organization: form.organization.trim() || null,
   email: form.email.trim() || null,
   phone: form.phone.trim() || null,
   departureCity: form.departureCity.trim() || null,
   arrivalCity: form.arrivalCity.trim() || null,
   departureDate: form.departureDate.trim() || null,
   returnDate: form.returnDate.trim() || null,
   passengerCount: form.passengerCount.trim() ? Number(form.passengerCount) : null,
   tripType: form.tripType || null,
   hasIntermediateStop: form.hasIntermediateStop,
   intermediateStops: form.hasIntermediateStop
    ? form.intermediateStops
       .split(",")
       .map((value) => value.trim())
       .filter(Boolean)
    : [],
   options: form.options,
   status: form.status,
   humanReviewReason: form.humanReviewReason.trim() || null
  };

  try {
   const response = await fetch(`/api/leads/${lead.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
   body: JSON.stringify(patch)
   });
   const json = await response.json().catch(() => null);
   if (!response.ok) throw new Error(errorMessage(json));

   setState({ status: "saved", message: "Modifications enregistrées." });
   router.refresh();
  } catch (caught) {
   setState({
    status: "error",
    message: caught instanceof Error ? caught.message : "Échec de l'enregistrement, réessayez."
   });
  }
 }

 return (
  <section className={`${styles.card} ${isReview ? styles.review : ""}`} aria-label="Modifier la demande">
   <div className={styles.head}>
    <div>
     <p className={styles.kicker}>
      <Pencil aria-hidden="true" size={13} /> Édition directe
     </p>
     <h2>Modifier la demande</h2>
    </div>
    {isReview ? (
     <span className={styles.reviewTag}>
      <AlertTriangle aria-hidden="true" size={14} /> Reprise humaine
     </span>
    ) : null}
   </div>

   {isReview ? (
    <p className={styles.reviewNote}>
     Cette demande est en reprise humaine : corrigez les informations manquantes ou erronées, puis changez le
     statut pour la faire avancer.
    </p>
   ) : null}

   <form onSubmit={handleSubmit} className={styles.form}>
   <div className={styles.grid}>
     <label>
      Type de client
      <select value={form.clientType} onChange={(event) => set("clientType", event.target.value)}>
       <option value="">A confirmer</option>
       <option value="Particulier">Particulier</option>
       <option value="Entreprise">Entreprise</option>
       <option value="Association">Association</option>
       <option value="Agence">Agence</option>
       <option value="Ecole">Ecole</option>
       <option value="Collectivite">Collectivite</option>
      </select>
     </label>
     <label>
      Nom du contact
      <input value={form.contactName} onChange={(event) => set("contactName", event.target.value)} />
     </label>
     <label>
      Organisation
      <input value={form.organization} onChange={(event) => set("organization", event.target.value)} />
     </label>
     <label>
      Email
      <input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
     </label>
     <label>
      Telephone
      <input type="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
     </label>
     <label>
      Ville de départ
      <input value={form.departureCity} onChange={(event) => set("departureCity", event.target.value)} />
     </label>
     <label>
      Ville d&apos;arrivée
      <input value={form.arrivalCity} onChange={(event) => set("arrivalCity", event.target.value)} />
     </label>
     <label>
      Date de départ
      <input type="date" value={form.departureDate} onChange={(event) => set("departureDate", event.target.value)} />
     </label>
     <label>
      Date de retour
      <input type="date" value={form.returnDate} onChange={(event) => set("returnDate", event.target.value)} />
     </label>
     <label>
      Passagers
      <input
       type="number"
       min="1"
       value={form.passengerCount}
       onChange={(event) => set("passengerCount", event.target.value)}
      />
     </label>
     <label>
     Type de trajet
      <select
       value={form.tripType}
       onChange={(event) => setTripType(event.target.value)}
      >
       <option value="">—</option>
       <option value="one_way">Aller simple</option>
       <option value="round_trip">Aller-retour</option>
      </select>
     </label>
     <fieldset className={`${styles.full} ${styles.optionChoices}`}>
      <legend>Escales</legend>
      <label className={styles.optionChoice}>
       <input
        type="checkbox"
        checked={form.hasIntermediateStop}
        onChange={(event) => toggleIntermediateStop(event.target.checked)}
       />
       <span>Trajet avec arrêt intermédiaire ou multi-destination</span>
      </label>
      {form.hasIntermediateStop ? (
       <label>
        Villes intermediaires
        <input
         value={form.intermediateStops}
         onChange={(event) => set("intermediateStops", event.target.value)}
         placeholder="Ex. Lyon, Dijon"
        />
       </label>
      ) : (
       <span className={styles.fieldHelp}>Cochez l’option ci-dessus pour renseigner une ou plusieurs escales.</span>
      )}
      <span className={styles.fieldHelp}>Les trajets avec escale partent en reprise humaine avant devis.</span>
     </fieldset>
     <fieldset className={`${styles.full} ${styles.optionChoices}`}>
      <legend>Options</legend>
      <div className={styles.optionChoiceGrid}>
       {OPTION_CHOICES.map((option) => (
        <label className={styles.optionChoice} key={option.code}>
         <input
          type="checkbox"
          checked={form.options.includes(option.code)}
          onChange={() => toggleOption(option.code)}
         />
         <span>{option.label}</span>
        </label>
       ))}
       {form.options
        .filter((value) => !OPTION_CHOICES.some((option) => option.code === value))
        .map((value) => (
         <label className={styles.optionChoice} key={value}>
          <input type="checkbox" checked onChange={() => toggleOption(value)} />
          <span>Ancienne option : {value}</span>
         </label>
        ))}
      </div>
     </fieldset>
     <label>
      Statut
      <select value={form.status} onChange={(event) => set("status", event.target.value)}>
       {statusOptions.map((value) => (
        <option key={value} value={value}>
         {getStatusDisplay(value).label}
        </option>
       ))}
      </select>
     </label>
     <label className={styles.full}>
      Raison de reprise humaine
      <textarea
       rows={2}
       value={form.humanReviewReason}
       onChange={(event) => set("humanReviewReason", event.target.value)}
       placeholder="Ex. distance à confirmer, demande atypique..."
      />
     </label>
    </div>

    <div className={styles.actions}>
     {state.status === "error" ? <span className={styles.error}>{state.message}</span> : null}
     {state.status === "saved" ? (
      <span className={styles.ok}>
       <Check aria-hidden="true" size={15} /> {state.message}
      </span>
     ) : null}
     <button type="submit" className={styles.save} disabled={state.status === "saving"}>
      {state.status === "saving" ? (
       <>
        <Loader2 aria-hidden="true" size={16} className={styles.spin} /> Enregistrement…
       </>
      ) : (
       "Enregistrer les modifications"
      )}
     </button>
    </div>
   </form>
  </section>
 );
}

function errorMessage(json: unknown) {
 if (!json || typeof json !== "object") return "Échec de l'enregistrement, réessayez.";
 const record = json as { error?: unknown };
 if (record.error && typeof record.error === "object" && "message" in record.error) {
  const error = record.error as { message?: unknown; details?: { missingFields?: string[] } };
  if (Array.isArray(error.details?.missingFields) && error.details.missingFields.length > 0) {
   return `${String(error.message ?? "Champs manquants.")} (${error.details.missingFields.join(", ")})`;
  }
  return String(error.message ?? "Échec de l'enregistrement, réessayez.");
 }
 if (typeof record.error === "string") return record.error;
 return "Échec de l'enregistrement, réessayez.";
}
