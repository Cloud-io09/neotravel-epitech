"use client";

import { useEffect, useState } from "react";
import { defaultLanguage, languageChangeEvent, languageStorageKey, type LanguageCode } from "@/shared/i18n/translations";
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
 const [downloadLanguage, setDownloadLanguage] = useState<LanguageCode>(defaultLanguage);

 useEffect(() => {
  function syncLanguage() {
   const stored = window.localStorage.getItem(languageStorageKey);
   if (stored && ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"].includes(stored)) {
    setDownloadLanguage(stored as LanguageCode);
    return;
   }
   setDownloadLanguage(defaultLanguage);
  }

  syncLanguage();
  window.addEventListener(languageChangeEvent, syncLanguage);
  return () => window.removeEventListener(languageChangeEvent, syncLanguage);
 }, []);

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
    <a className={styles.download} href={`/api/quotes/${quoteId}/pdf?lang=${downloadLanguage}`} data-i18n-key="Telecharger">
     Telecharger
    </a>
    <button
     className={styles.primary}
     type="button"
     disabled={state === "loading"}
     onClick={() => run("accept")}
     data-i18n-key="Accepter"
    >
     Accepter
    </button>
    <button
     className={styles.danger}
     type="button"
     disabled={state === "loading"}
     onClick={() => run("refuse")}
     data-i18n-key="Refuser"
    >
     Refuser
    </button>
   </div>
   <p className={state === "error" ? styles.errorMessage : styles.actionMessage} data-i18n-key={message}>
    {message}
   </p>
  </div>
 );
}
