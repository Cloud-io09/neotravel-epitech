"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/shared/lib/supabase/client";
import styles from "./connexion.module.css";

// Landing page of the password-recovery email link. Supabase establishes a temporary recovery
// session from the URL; the user sets a new password (no current password required).
export function ClientNewPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
      if (!data.session) {
        setMessage("Lien de réinitialisation invalide ou expiré. Redemandez un lien.");
        setStatus("error");
      }
    });
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setStatus("error");
      setMessage("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setStatus("error");
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setStatus("loading");
    setMessage(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("done");
      setMessage("Mot de passe mis à jour. Redirection vers votre espace…");
      router.push("/compte");
    } catch {
      setStatus("error");
      setMessage("Mise à jour impossible. Le lien a peut-être expiré — redemandez-en un.");
    }
  }

  return (
    <form className={styles.loginCard} aria-label="Nouveau mot de passe client" onSubmit={onSubmit}>
      <div>
        <p className={styles.kicker}>Espace client</p>
        <h2>Nouveau mot de passe</h2>
      </div>

      <label className={styles.field}>
        Nouveau mot de passe
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!ready || status === "loading" || status === "done"}
        />
      </label>

      <label className={styles.field}>
        Confirmer
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          disabled={!ready || status === "loading" || status === "done"}
        />
      </label>

      <button className={styles.primaryButton} type="submit" disabled={!ready || status === "loading" || status === "done"}>
        {status === "loading" ? "Mise à jour…" : "Définir le mot de passe"}
      </button>

      {message ? <p className={styles.note}>{message}</p> : null}
    </form>
  );
}
