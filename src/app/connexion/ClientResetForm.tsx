"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/shared/lib/supabase/client";
import styles from "./connexion.module.css";

export function ClientResetForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/connexion/nouveau-mot-de-passe`,
      });
      if (error) throw error;
      setStatus("sent");
      setMessage("Si un compte client existe pour cet email, un lien de réinitialisation vient d'être envoyé.");
    } catch {
      setStatus("error");
      setMessage("Envoi impossible pour le moment. Réessayez dans un instant.");
    }
  }

  return (
    <form className={styles.loginCard} aria-label="Reinitialisation mot de passe client" onSubmit={onSubmit}>
      <div>
        <p className={styles.kicker}>Mot de passe oublié</p>
        <h2>Recevoir le lien</h2>
      </div>

      <label className={styles.field}>
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="client@exemple.fr"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading" || status === "sent"}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={status === "loading" || status === "sent"}>
        {status === "loading" ? "Envoi…" : status === "sent" ? "Lien envoyé" : "Envoyer le lien"}
      </button>

      {message ? <p className={styles.note}>{message}</p> : null}

      <p className={styles.note}>
        La réinitialisation concerne uniquement le compte client. Les accès internes restent séparés.
      </p>
    </form>
  );
}
