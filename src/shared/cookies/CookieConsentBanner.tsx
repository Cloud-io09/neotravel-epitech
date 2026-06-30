"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Cookie, SlidersHorizontal, X } from "lucide-react";
import styles from "./CookieConsentBanner.module.css";

const CONSENT_COOKIE = "neotravel_cookie_consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

type CookieConsent = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

function readConsent(): CookieConsent | null {
  if (typeof document === "undefined") return null;

  const raw = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${CONSENT_COOKIE}=`))
    ?.split("=")[1];

  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CookieConsent>;
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function writeConsent(consent: CookieConsent) {
  const value = encodeURIComponent(JSON.stringify(consent));
  document.cookie = `${CONSENT_COOKIE}=${value}; Max-Age=${CONSENT_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function CookieConsentBanner() {
  const [loaded, setLoaded] = useState(false);
  const [visible, setVisible] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const existing = readConsent();
    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
      setVisible(false);
    } else {
      setVisible(true);
    }
    setLoaded(true);
  }, []);

  const consent = useMemo<CookieConsent>(
    () => ({
      necessary: true,
      analytics,
      marketing,
      savedAt: new Date().toISOString(),
    }),
    [analytics, marketing],
  );

  function save(next: Pick<CookieConsent, "analytics" | "marketing">) {
    writeConsent({
      necessary: true,
      analytics: next.analytics,
      marketing: next.marketing,
      savedAt: new Date().toISOString(),
    });
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setCustomizing(false);
    setVisible(false);
  }

  if (!loaded) return null;

  return (
    <>
      {visible ? (
        <section className={styles.banner} aria-label="Gestion des cookies">
          <div className={styles.iconBox} aria-hidden="true">
            <Cookie size={22} />
          </div>
          <div className={styles.content}>
            <p className={styles.eyebrow}>Confidentialite</p>
            <h2>Gestion des cookies NeoTravel</h2>
            <p>
              Nous utilisons des cookies necessaires au fonctionnement du site, de la connexion et de la securite.
              Les cookies de mesure d&apos;audience ou marketing restent desactives sans votre accord.
            </p>

            {customizing ? (
              <div className={styles.preferences}>
                <label className={styles.preference}>
                  <span>
                    <strong>Cookies necessaires</strong>
                    <small>Session, securite, consentement. Toujours actifs.</small>
                  </span>
                  <input type="checkbox" checked disabled aria-label="Cookies necessaires toujours actifs" />
                </label>
                <label className={styles.preference}>
                  <span>
                    <strong>Mesure d&apos;audience</strong>
                    <small>Aucune mesure n&apos;est chargee tant que cette option n&apos;est pas acceptee.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(event) => setAnalytics(event.target.checked)}
                  />
                </label>
                <label className={styles.preference}>
                  <span>
                    <strong>Marketing</strong>
                    <small>Aucun pixel publicitaire n&apos;est charge sans consentement.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(event) => setMarketing(event.target.checked)}
                  />
                </label>
              </div>
            ) : null}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondaryButton} onClick={() => save({ analytics: false, marketing: false })}>
              <X size={16} aria-hidden="true" />
              Tout refuser
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setCustomizing((value) => !value)}>
              <SlidersHorizontal size={16} aria-hidden="true" />
              Personnaliser
            </button>
            {customizing ? (
              <button type="button" className={styles.primaryButton} onClick={() => save(consent)}>
                <Check size={16} aria-hidden="true" />
                Enregistrer
              </button>
            ) : (
              <button type="button" className={styles.primaryButton} onClick={() => save({ analytics: true, marketing: true })}>
                <Check size={16} aria-hidden="true" />
                Tout accepter
              </button>
            )}
          </div>
        </section>
      ) : (
        <button type="button" className={styles.manageButton} onClick={() => setVisible(true)}>
          <Cookie size={16} aria-hidden="true" />
          Cookies
        </button>
      )}
    </>
  );
}
