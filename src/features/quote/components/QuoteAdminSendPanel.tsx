"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./quote-client.module.css";

export function QuoteAdminSendPanel({ quoteId, status }: { quoteId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sendQuote() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, { method: "POST" });
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        setError(json?.error?.message ?? "Envoi du devis impossible.");
        return;
      }

      setMessage(json?.skipped ? "Devis déjà envoyé." : "Email devis envoyé ou simulé. Relances planifiées.");
      router.refresh();
    } catch {
      setError("Erreur réseau pendant l’envoi du devis.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "QUOTE_SENT") {
    return (
      <section className={styles.adminActionPanel}>
        <strong>Action commerciale</strong>
        <p>Devis déjà envoyé au client. Les relances automatiques sont maintenant pilotées par n8n / send-due.</p>
      </section>
    );
  }

  if (status !== "QUOTE_READY") {
    return (
      <section className={styles.adminActionPanel}>
        <strong>Action commerciale</strong>
        <p>Ce devis n’est plus en statut prêt. Aucune relance ne démarre depuis cette page.</p>
      </section>
    );
  }

  return (
    <section className={styles.adminActionPanel}>
      <div>
        <strong>Action commerciale</strong>
        <p>Envoyer le devis au client. Cette action passe le devis en envoyé et planifie les relances.</p>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={sendQuote} disabled={busy}>
          {busy ? "Envoi…" : "Envoyer le devis et démarrer les relances"}
        </button>
      </div>
      {message ? <p className={styles.actionMessage}>{message}</p> : null}
      {error ? <p className={styles.errorMessage}>{error}</p> : null}
    </section>
  );
}
