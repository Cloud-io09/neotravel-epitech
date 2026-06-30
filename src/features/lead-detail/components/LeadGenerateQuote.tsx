"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import styles from "./lead-detail.module.css";

export function LeadGenerateQuote({ leadId, status }: { leadId: string; status: string }) {
 const router = useRouter();
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState<string | null>(null);

 async function generateQuote() {
  setBusy(true);
  setError(null);

  try {
   const response = await fetch("/api/quotes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ leadId })
   });
   const json = await response.json().catch(() => null);

   if (!response.ok) {
    setError(json?.error ?? "Génération du devis impossible.");
    return;
   }

   router.refresh();
  } catch {
   setError("Erreur réseau pendant la génération du devis.");
  } finally {
   setBusy(false);
  }
 }

 if (status === "HUMAN_REVIEW") {
  return <p className={styles.genHint}>Validation commerciale requise avant devis.</p>;
 }

 if (status === "QUALIFIED" || status === "HIGH_VALUE") {
  return (
   <>
    <button type="button" className={styles.primary} onClick={generateQuote} disabled={busy}>
     {busy ? (
      <>
       <Loader2 className={styles.spin} aria-hidden="true" size={16} /> Génération…
      </>
     ) : (
      "Générer le devis"
     )}
    </button>
    <p className={styles.genHint}>Le devis sera calculé par le moteur déterministe, sans envoi email immédiat.</p>
    {error ? <p className={styles.genError}>{error}</p> : null}
   </>
  );
 }

 return <p className={styles.genHint}>Le devis sera prepare automatiquement une fois la demande qualifiee.</p>;
}
