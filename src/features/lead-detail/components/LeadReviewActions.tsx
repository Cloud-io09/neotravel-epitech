"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import type { Lead } from "@/shared/types/lead";
import { humanReviewReasonLabel } from "@/features/human-review/reasonLabels";
import styles from "./leadReview.module.css";

export function LeadReviewActions({ lead }: { lead: Lead }) {
 const router = useRouter();
 const [busy, setBusy] = useState<null | "validate" | "reject">(null);
 const [error, setError] = useState<string | null>(null);
 const isInterestedIntent = lead.humanReviewReason === "QUOTE_ACCEPTED_INTENT";
 const isRefusedIntent = lead.humanReviewReason === "QUOTE_REFUSED_INTENT";

 // Décision humaine pertinente seulement quand la demande est en revue.
 if (lead.status !== "HUMAN_REVIEW") return null;

 async function decide(kind: "validate" | "reject") {
  setBusy(kind);
  setError(null);

  try {
   const response =
    isInterestedIntent || isRefusedIntent
     ? await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
         kind === "validate"
          ? { status: "QUOTE_SENT", humanReviewReason: null }
          : {
             status: "LOST",
             humanReviewReason: isRefusedIntent
              ? "Refus client confirmé par le commercial."
              : lead.humanReviewReason
            }
        )
       })
     : await fetch(`/api/human-review/${lead.id}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetStatus: kind === "validate" ? "QUALIFIED" : "LOST" })
       });
   const json = await response.json().catch(() => null);
   if (!response.ok) throw new Error(errorMessage(json));
   router.refresh();
  } catch (caught) {
   setError(caught instanceof Error ? caught.message : "Action impossible, réessayez.");
   setBusy(null);
  }
 }

 return (
  <section id="human-review-actions" className={styles.card} aria-label="Décision humaine">
   <div className={styles.copy}>
    <p className={styles.kicker}>Revue humaine</p>
    <h2>{isInterestedIntent || isRefusedIntent ? "Réponse client à traiter" : "Votre décision sur cette demande"}</h2>
    <p className={styles.reason}>{humanReviewReasonLabel(lead.humanReviewReason)}</p>
   </div>

   <div className={styles.actions}>
    {error ? <span className={styles.error}>{error}</span> : null}
    {!isInterestedIntent ? (
     <button className={styles.reject} type="button" onClick={() => decide("reject")} disabled={busy !== null}>
      {busy === "reject" ? <Loader2 className={styles.spin} aria-hidden="true" size={16} /> : <X aria-hidden="true" size={16} />}
      {isRefusedIntent ? "Marquer comme perdu" : "Refuser"}
     </button>
    ) : null}
    <button className={styles.validate} type="button" onClick={() => decide("validate")} disabled={busy !== null}>
     {busy === "validate" ? <Loader2 className={styles.spin} aria-hidden="true" size={16} /> : <Check aria-hidden="true" size={16} />}
     {isInterestedIntent ? "Reprendre le dossier" : isRefusedIntent ? "Réouvrir le suivi" : "Valider et envoyer le devis"}
    </button>
   </div>

   <div className={styles.emailPreview} aria-label="Suite commerciale">
    <strong>Suite commerciale</strong>
    <p>
     Destinataire : {lead.email ?? "email à renseigner"}. Après validation, le devis est généré si nécessaire,
     envoyé au client, puis les relances sont planifiées. Si des informations restent manquantes, la validation
     est bloquée avec un message explicite.
    </p>
   </div>
  </section>
 );
}

function errorMessage(json: unknown) {
 if (json && typeof json === "object") {
  const record = json as { error?: unknown };
  if (record.error && typeof record.error === "object" && "message" in record.error) {
   return String((record.error as { message?: unknown }).message ?? "Action impossible, réessayez.");
  }
  if (typeof record.error === "string") return record.error;
 }
 return "Action impossible, réessayez.";
}
