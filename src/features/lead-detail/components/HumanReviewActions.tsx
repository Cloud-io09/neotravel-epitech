"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./lead-detail.module.css";

type ActionState = "idle" | "loading" | "done" | "error";

export function HumanReviewActions({ leadId, humanReviewReason }: { leadId: string; humanReviewReason: string | null | undefined }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [state, setState] = useState<ActionState>("idle");
  const [notifyState, setNotifyState] = useState<ActionState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function resolve(targetStatus: "QUALIFIED" | "INCOMPLETE" | "LOST") {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch(`/api/human-review/${leadId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStatus, notes: notes.trim() || undefined }),
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? "Erreur");
      setState("done");
      setMessage(
        targetStatus === "QUALIFIED"
          ? "Dossier qualifié manuellement. Le devis peut être généré."
          : targetStatus === "LOST"
            ? "Dossier rejeté."
            : "Dossier marqué incomplet.",
      );
      router.refresh();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Erreur inattendue.");
    }
  }

  async function notify() {
    setNotifyState("loading");
    try {
      const res = await fetch(`/api/human-review/${leadId}/notify`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? "Erreur");
      setNotifyState("done");
    } catch {
      setNotifyState("error");
    }
  }

  const loading = state === "loading";
  const done = state === "done";

  return (
    <div className={styles.humanReviewPanel}>
      <p className={styles.humanReviewLabel}>
        Escalade : <strong>{humanReviewReason ?? "Raison non précisée"}</strong>
      </p>

      {!done && (
        <>
          <label className={styles.humanReviewNotesLabel}>
            Notes de résolution
            <textarea
              className={styles.humanReviewNotes}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, justification, actions prises…"
              rows={3}
              disabled={loading}
            />
          </label>

          <div className={styles.humanReviewButtons}>
            <button
              className={styles.primary}
              type="button"
              disabled={loading}
              onClick={() => void resolve("QUALIFIED")}
            >
              {loading ? "En cours…" : "Qualifier manuellement"}
            </button>
            <button
              className={styles.secondary}
              type="button"
              disabled={loading}
              onClick={() => void resolve("INCOMPLETE")}
            >
              Marquer incomplet
            </button>
            <button
              className={styles.ghost}
              type="button"
              disabled={loading}
              onClick={() => void resolve("LOST")}
            >
              Rejeter
            </button>
          </div>
        </>
      )}

      <div className={styles.humanReviewNotify}>
        <button
          className={styles.secondary}
          type="button"
          disabled={notifyState === "loading" || notifyState === "done"}
          onClick={() => void notify()}
        >
          {notifyState === "done"
            ? "Équipe notifiée"
            : notifyState === "loading"
              ? "Envoi…"
              : "Notifier l'équipe"}
        </button>
        {notifyState === "error" && (
          <span className={styles.humanReviewError}>Notification échouée.</span>
        )}
      </div>

      {message && (
        <p className={state === "error" ? styles.humanReviewError : styles.humanReviewSuccess}>
          {message}
        </p>
      )}
    </div>
  );
}
