"use client";

import { useState } from "react";
import styles from "./quote-client.module.css";

type ActionState = "idle" | "loading" | "done" | "error";

async function postQuoteAction(quoteId: string, action: "accept" | "refuse") {
  const response = await fetch(`/api/quotes/${quoteId}/${action}`, { method: "POST" });
  if (!response.ok) throw new Error("Action impossible pour ce devis.");
  return response.json();
}

export function QuoteClientActions({ quoteId }: { quoteId: string }) {
  const [state, setState] = useState<ActionState>("idle");
  const [message, setMessage] = useState("Vous pouvez telecharger, accepter ou refuser ce devis.");

  async function run(action: "accept" | "refuse") {
    setState("loading");
    setMessage(action === "accept" ? "Acceptation en cours..." : "Refus en cours...");

    try {
      await postQuoteAction(quoteId, action);
      setState("done");
      setMessage(action === "accept" ? "Devis accepte, pipeline mis a jour." : "Devis refuse, trace conservee.");
    } catch {
      setState("error");
      setMessage("Action non finalisee. Reprise humaine possible depuis le dashboard.");
    }
  }

  return (
    <div className={styles.actionPanel}>
      <div className={styles.actions}>
        <a className={styles.download} href={`/api/quotes/${quoteId}/pdf`}>
          Telecharger
        </a>
        <button className={styles.primary} type="button" disabled={state === "loading"} onClick={() => run("accept")}>
          Accepter
        </button>
        <button className={styles.danger} type="button" disabled={state === "loading"} onClick={() => run("refuse")}>
          Refuser
        </button>
      </div>
      <p className={state === "error" ? styles.errorMessage : styles.actionMessage}>{message}</p>
    </div>
  );
}
