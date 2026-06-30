"use client";

import { useEffect, useState } from "react";
import {
  defaultLanguage,
  languageChangeEvent,
  languageStorageKey,
  type LanguageCode,
} from "@/shared/i18n/translations";
import styles from "./quote-client.module.css";

type ActionState = "idle" | "loading" | "interested" | "notInterested" | "accepted" | "refused" | "closed" | "error";
type QuoteViewer = "client" | "admin";
type QuoteOutcome = "pending" | "interested" | "notInterested" | "accepted" | "refused" | "closed";

async function postQuoteAction(quoteId: string, action: "accept" | "refuse") {
  const response = await fetch(`/api/quotes/${quoteId}/${action}`, { method: "POST" });
  if (!response.ok) throw new Error("Action impossible pour ce devis.");
  return response.json();
}

export function QuoteClientActions({
  quoteId,
  initialStatus = "QUOTE_READY",
  initialOutcome,
  viewer = "client",
  commercialFollowup = false,
}: {
  quoteId: string;
  initialStatus?: string;
  initialOutcome?: QuoteOutcome;
  viewer?: QuoteViewer;
  commercialFollowup?: boolean;
}) {
  const outcome = initialOutcome ?? (initialStatus === "CLOSED" ? "closed" : "pending");
  const isAdmin = viewer === "admin";

  const [state, setState] = useState<ActionState>(
    outcome === "pending" ? "idle" : outcome,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    setErrorMessage(null);

    try {
      await postQuoteAction(quoteId, action);
      setState(action === "accept" ? "interested" : "notInterested");
    } catch {
      setState("error");
      setErrorMessage("Action non finalisée. Réessayez ou contactez notre équipe.");
    }
  }

  // Urgent departure (client side): the devis is shown but can't be accepted/refused online —
  // a commercial confirms availability and takes over. Final outcomes still display normally.
  if (commercialFollowup && !isAdmin && (state === "idle" || initialStatus === "QUOTE_READY")) {
    return (
      <div className={styles.actionPanel}>
        <div className={styles.actions}>
          <a className={styles.download} href={`/api/quotes/${quoteId}/pdf?lang=${downloadLanguage}`} data-i18n-key="Télécharger">
            Télécharger PDF
          </a>
        </div>
        <p className={styles.actionMessage}>
          Votre départ est proche : un conseiller NeoTravel vous recontacte rapidement pour confirmer la
          disponibilité. Vous pouvez d’ores et déjà télécharger votre estimation.
        </p>
      </div>
    );
  }

  if (initialStatus === "QUOTE_READY") {
    return (
      <div className={styles.actionPanel}>
        <div className={styles.actions}>
          <a className={styles.download} href={`/api/quotes/${quoteId}/pdf?lang=${downloadLanguage}`} data-i18n-key="Télécharger">
            Télécharger PDF
          </a>
        </div>
        <p className={styles.actionMessage}>
          {isAdmin
            ? "Devis prêt mais pas encore envoyé : envoyez-le depuis la fiche demande avant de noter une intention client."
            : "Ce devis est encore en préparation. Un lien vous sera envoyé lorsqu’il sera transmis officiellement."}
        </p>
      </div>
    );
  }

  if (state === "interested" || state === "notInterested" || state === "accepted" || state === "refused" || state === "closed") {
    const finalMessage =
      state === "interested"
        ? isAdmin
          ? "Intention client enregistrée : intéressé. Relances suspendues, reprise commerciale requise."
          : "Merci, votre intérêt est bien enregistré. Un conseiller NeoTravel reprend le dossier."
        : state === "notInterested"
          ? isAdmin
            ? "Intention client enregistrée : pas intéressé. Relances suspendues, confirmation commerciale requise."
            : "Merci pour votre retour. Votre refus est enregistré et notre équipe en prend note."
          : state === "accepted"
        ? isAdmin
          ? "Réponse client enregistrée : devis accepté."
          : "Devis accepté. Un conseiller NeoTravel reprend le dossier."
        : state === "refused"
          ? isAdmin
            ? "Réponse client enregistrée : devis refusé."
            : "Devis refusé. Merci pour votre retour, notre équipe en prend note."
          : "Ce devis a déjà été finalisé.";

    return (
      <div className={styles.actionPanel}>
        <div className={styles.actions}>
          <a className={styles.download} href={`/api/quotes/${quoteId}/pdf?lang=${downloadLanguage}`} data-i18n-key="Télécharger">
            Télécharger PDF
          </a>
        </div>
        <p className={state === "notInterested" || state === "refused" ? styles.refusedMessage : styles.actionMessage}>{finalMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.actionPanel}>
      <div className={styles.actions}>
        <a className={styles.download} href={`/api/quotes/${quoteId}/pdf?lang=${downloadLanguage}`} data-i18n-key="Télécharger">
          Télécharger
        </a>
        <button
          className={styles.primary}
          type="button"
          disabled={state === "loading"}
          onClick={() => run("accept")}
          data-i18n-key={isAdmin ? undefined : "Accepter"}
        >
          {state === "loading" ? "En cours..." : isAdmin ? "Noter intéressé" : "Je suis intéressé"}
        </button>
        <button
          className={styles.danger}
          type="button"
          disabled={state === "loading"}
          onClick={() => run("refuse")}
          data-i18n-key={isAdmin ? undefined : "Refuser"}
        >
          {isAdmin ? "Noter pas intéressé" : "Pas intéressé"}
        </button>
      </div>
      {state === "error" && errorMessage && (
        <p className={styles.errorMessage}>{errorMessage}</p>
      )}
      {state === "idle" && (
        <p className={styles.actionMessage}>
          {isAdmin
            ? "Espace interne : notez uniquement une intention client confirmée (email, téléphone ou accord écrit)."
            : "Vous pouvez télécharger le devis ou indiquer votre intention. Cela ne valide pas définitivement le dossier."}
        </p>
      )}
    </div>
  );
}
