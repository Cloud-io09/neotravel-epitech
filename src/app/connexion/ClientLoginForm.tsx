"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./connexion.module.css";

export function ClientLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/client-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; redirectTo?: string; error?: { message?: string } }
        | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? "Identifiants invalides.");
        setIsSubmitting(false);
        return;
      }

      router.push(payload?.redirectTo ?? "/compte");
      router.refresh();
    } catch {
      setError("Connexion impossible.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.loginCard} onSubmit={onSubmit} aria-label="Connexion espace client">
      <div>
        <p className={styles.kicker}>Connexion client</p>
        <h2>Accès client</h2>
      </div>

      <label className={styles.field}>
        Email
        <input name="email" type="email" autoComplete="email" placeholder="client@exemple.fr" required />
      </label>

      <label className={styles.field}>
        Mot de passe
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Votre mot de passe"
          required
        />
      </label>

      {error ? <p className={styles.formError}>{error}</p> : null}

      <button className={styles.primaryButton} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Connexion..." : "Se connecter"}
      </button>

      <p className={styles.note}>
        Cette connexion est réservée au suivi client. Elle ne donne pas accès au dashboard interne NeoTravel.
      </p>
    </form>
  );
}
