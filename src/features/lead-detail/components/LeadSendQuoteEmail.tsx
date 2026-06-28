"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2 } from "lucide-react";
import styles from "./lead-detail.module.css";

export function LeadSendQuoteEmail({ quoteId, status }: { quoteId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const alreadySent = status === "QUOTE_SENT";

  async function send() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, { method: "POST" });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        setError(json?.error?.message ?? "Envoi du devis impossible.");
        setBusy(false);
        return;
      }

      setMessage(json?.skipped ? "Devis déjà envoyé." : "Email devis envoyé. Relances programmées.");
      router.refresh();
    } catch {
      setError("Erreur réseau, réessayez.");
    } finally {
      setBusy(false);
    }
  }

  if (alreadySent) {
    return <p className={styles.genHint}>Devis déjà envoyé au client.</p>;
  }

  return (
    <>
      <button type="button" className={styles.primary} onClick={send} disabled={busy}>
        {busy ? (
          <>
            <Loader2 className={styles.spin} aria-hidden="true" size={16} /> Envoi…
          </>
        ) : (
          <>
            <Mail aria-hidden="true" size={16} /> Envoyer devis
          </>
        )}
      </button>
      {message ? <p className={styles.genHint}>{message}</p> : null}
      {error ? <p className={styles.genError}>{error}</p> : null}
    </>
  );
}
