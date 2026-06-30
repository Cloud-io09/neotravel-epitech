"use client";

import { useState } from "react";
import styles from "./account.module.css";

type DocumentFile = {
  name: string;
  description: string;
};

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DocumentDownloadButton({ document }: { document: DocumentFile }) {
  const [status, setStatus] = useState("");

  function downloadDocument() {
    downloadTextFile(
      document.name.replace(".pdf", ".txt"),
      [
        "NeoTravel - document client",
        "",
        `Document : ${document.name}`,
        document.description,
        "",
        "Version de demonstration locale. En production, ce bouton telechargera le PDF stocke dans l'espace client."
      ].join("\n")
    );
    setStatus("Telechargement lance.");
  }

  return (
    <>
      <button className={styles.secondaryButton} type="button" onClick={downloadDocument}>
        Telecharger
      </button>
      {status ? <p className={styles.actionStatus}>{status}</p> : null}
    </>
  );
}

export function ProfileForm() {
  const [status, setStatus] = useState("");

  function saveProfile(formData: FormData) {
    const profile = Object.fromEntries(formData.entries());
    window.localStorage.setItem("neotravel-client-profile-demo", JSON.stringify(profile));
    setStatus("Informations personnelles enregistrees en local pour la demo.");
  }

  return (
    <form className={styles.formGrid} action={saveProfile}>
      <label className={styles.field}>
        Prenom
        <input name="firstName" placeholder="Votre prenom" />
      </label>
      <label className={styles.field}>
        Nom
        <input name="lastName" placeholder="Votre nom" />
      </label>
      <label className={styles.field}>
        Organisation
        <input name="organization" placeholder="Votre organisation" />
      </label>
      <label className={styles.field}>
        Adresse
        <input name="address" placeholder="Votre adresse" />
      </label>
      <label className={styles.field}>
        Complement d'adresse
        <input name="address2" placeholder="Batiment, etage, service" />
      </label>
      <label className={styles.field}>
        Code postal
        <input name="postalCode" placeholder="Code postal" />
      </label>
      <label className={styles.field}>
        Ville
        <input name="city" placeholder="Ville" />
      </label>
      <label className={styles.field}>
        Pays
        <input name="country" defaultValue="France" />
      </label>
      <label className={styles.field}>
        Email
        <input name="email" type="email" placeholder="votre@email.fr" />
      </label>
      <label className={styles.field}>
        Telephone
        <input name="phone" placeholder="+33 ..." />
      </label>
      <button className={styles.primaryButton} type="submit">
        Enregistrer
      </button>
      {status ? <p className={styles.actionStatus}>{status}</p> : null}
    </form>
  );
}

export function DeletionRequestForm() {
  const [status, setStatus] = useState("");

  function requestDeletion(formData: FormData) {
    const requestedAt = new Date().toISOString();
    const hasPassword = Boolean(String(formData.get("password") ?? "").trim());

    if (!hasPassword) {
      setStatus("Veuillez confirmer avec votre mot de passe.");
      return;
    }

    window.localStorage.setItem("neotravel-client-deletion-demo", requestedAt);
    setStatus("Demande de suppression preparee. En production, elle sera transmise a NeoTravel.");
  }

  return (
    <form className={styles.stack} action={requestDeletion}>
      <label className={styles.field}>
        Confirmer avec votre mot de passe
        <input name="password" type="password" placeholder="Votre mot de passe" />
      </label>
      <button className={styles.dangerButton} type="submit">
        Envoyer la demande de suppression
      </button>
      {status ? <p className={styles.actionStatus}>{status}</p> : null}
    </form>
  );
}

export function PasswordUpdateForm() {
  const [status, setStatus] = useState("");

  function updatePassword(formData: FormData) {
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatus("Completez les champs mot de passe.");
      return;
    }

    if (newPassword.length < 8) {
      setStatus("Le nouveau mot de passe doit contenir au moins 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus("La confirmation ne correspond pas au nouveau mot de passe.");
      return;
    }

    window.localStorage.setItem("neotravel-client-password-demo-updated-at", new Date().toISOString());
    setStatus("Mot de passe verifie cote interface. En production, Supabase Auth fera la mise a jour.");
  }

  return (
    <form className={styles.formGrid} action={updatePassword}>
      <label className={styles.field}>
        Email de connexion
        <input name="email" type="email" defaultValue="client@neotravel.fr" />
      </label>
      <label className={styles.field}>
        Mot de passe actuel
        <input name="currentPassword" type="password" />
      </label>
      <label className={styles.field}>
        Nouveau mot de passe
        <input name="newPassword" type="password" />
      </label>
      <label className={styles.field}>
        Confirmer le nouveau mot de passe
        <input name="confirmPassword" type="password" />
      </label>
      <button className={styles.primaryButton} type="submit">
        Mettre a jour le mot de passe
      </button>
      {status ? <p className={styles.actionStatus}>{status}</p> : null}
    </form>
  );
}
