"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, Eye, Minus, RefreshCw, Sparkles, Type, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
 defaultLanguage,
 languageChangeEvent,
 languageStorageKey,
 translations,
 type LanguageCode
} from "@/shared/i18n/translations";
import styles from "./AccessibilityWidget.module.css";

type TextSize = "normal" | "large" | "xlarge";
type AccessibilityLabelKey =
 | "accessibility"
 | "openOptions"
 | "readingComfort"
 | "optionsTitle"
 | "textSize"
 | "normal"
 | "large"
 | "xlarge"
 | "increaseText"
 | "decreaseText"
 | "highContrast"
 | "reduceAnimations"
 | "simplifiedReading"
 | "resetDisplay"
 | "close";

const storageKeys = {
 textSize: "neotravel-accessibility-text-size",
 highContrast: "neotravel-accessibility-high-contrast",
 reduceMotion: "neotravel-accessibility-reduce-motion",
 readingMode: "neotravel-accessibility-reading-mode"
} as const;

const textSizes: TextSize[] = ["normal", "large", "xlarge"];
const languageCodes: LanguageCode[] = ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"];

const frenchLabels: Record<AccessibilityLabelKey, string> = {
 accessibility: "Accessibilité",
 openOptions: "Ouvrir les options d\u2019accessibilité",
 readingComfort: "Confort de lecture",
 optionsTitle: "Options d'accessibilité",
 textSize: "Taille du texte",
 normal: "Normal",
 large: "Grand",
 xlarge: "Très grand",
 increaseText: "Augmenter le texte",
 decreaseText: "Réduire le texte",
 highContrast: "Contraste élevé",
 reduceAnimations: "Réduire les animations",
 simplifiedReading: "Lecture simplifiée",
 resetDisplay: "Réinitialiser l'affichage",
 close: "Fermer"
};

function readBoolean(key: string) {
 return typeof window !== "undefined" && window.localStorage.getItem(key) === "true";
}

function readTextSize(): TextSize {
 if (typeof window === "undefined") return "normal";
 const stored = window.localStorage.getItem(storageKeys.textSize);
 return textSizes.includes(stored as TextSize) ? (stored as TextSize) : "normal";
}

function readLanguage(): LanguageCode {
 if (typeof window === "undefined") return defaultLanguage;
 const stored = window.localStorage.getItem(languageStorageKey) as LanguageCode | null;
 return stored && languageCodes.includes(stored) ? stored : defaultLanguage;
}

function translate(key: AccessibilityLabelKey, language: LanguageCode) {
 if (language === defaultLanguage) return frenchLabels[key];
 return translations[language as Exclude<LanguageCode, "FR">][`accessibility.${key}`] ?? frenchLabels[key];
}

function ensureMainTarget() {
 const currentMain = document.getElementById("main");
 if (currentMain?.tagName.toLowerCase() === "main") return;

 const firstMain = document.querySelector("main");
 if (firstMain && !firstMain.id) firstMain.id = "main";
}

export function AccessibilityWidget() {
 const pathname = usePathname();
 const panelRef = useRef<HTMLDivElement>(null);
 const [isOpen, setIsOpen] = useState(false);
 const [hasLoaded, setHasLoaded] = useState(false);
 const [textSize, setTextSize] = useState<TextSize>("normal");
 const [highContrast, setHighContrast] = useState(false);
 const [reduceMotion, setReduceMotion] = useState(false);
 const [readingMode, setReadingMode] = useState(false);
 const [language, setLanguage] = useState<LanguageCode>(defaultLanguage);

 const t = (key: AccessibilityLabelKey) => translate(key, language);

 useEffect(() => {
  ensureMainTarget();
 }, [pathname]);

 useEffect(() => {
  setTextSize(readTextSize());
  setHighContrast(readBoolean(storageKeys.highContrast));
  setReduceMotion(readBoolean(storageKeys.reduceMotion));
  setReadingMode(readBoolean(storageKeys.readingMode));
  setLanguage(readLanguage());
  setHasLoaded(true);
 }, []);

 useEffect(() => {
  function handleLanguageChange(event: Event) {
   const detail = (event as CustomEvent<LanguageCode>).detail;
   setLanguage(detail || readLanguage());
  }

  window.addEventListener(languageChangeEvent, handleLanguageChange);
  window.addEventListener("storage", handleLanguageChange);

  return () => {
   window.removeEventListener(languageChangeEvent, handleLanguageChange);
   window.removeEventListener("storage", handleLanguageChange);
  };
 }, []);

 useEffect(() => {
  if (!hasLoaded) return;

  const root = document.documentElement;
  root.classList.remove("text-size-normal", "text-size-large", "text-size-xlarge");
  root.classList.add(`text-size-${textSize}`);
  root.classList.toggle("high-contrast", highContrast);
  root.classList.toggle("reduce-motion", reduceMotion);
  root.classList.toggle("reading-mode", readingMode);

  if (textSize === "normal") {
   window.localStorage.removeItem(storageKeys.textSize);
  } else {
   window.localStorage.setItem(storageKeys.textSize, textSize);
  }

  if (highContrast) window.localStorage.setItem(storageKeys.highContrast, "true");
  else window.localStorage.removeItem(storageKeys.highContrast);

  if (reduceMotion) window.localStorage.setItem(storageKeys.reduceMotion, "true");
  else window.localStorage.removeItem(storageKeys.reduceMotion);

  if (readingMode) window.localStorage.setItem(storageKeys.readingMode, "true");
  else window.localStorage.removeItem(storageKeys.readingMode);
 }, [hasLoaded, textSize, highContrast, reduceMotion, readingMode]);

 useEffect(() => {
  if (!isOpen) return;

  function handleKeyDown(event: KeyboardEvent) {
   if (event.key === "Escape") setIsOpen(false);
  }

  window.addEventListener("keydown", handleKeyDown);
  panelRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

  return () => window.removeEventListener("keydown", handleKeyDown);
 }, [isOpen]);

 function increaseText() {
  setTextSize((current) => textSizes[Math.min(textSizes.indexOf(current) + 1, textSizes.length - 1)]);
 }

 function decreaseText() {
  setTextSize((current) => textSizes[Math.max(textSizes.indexOf(current) - 1, 0)]);
 }

 function resetSettings() {
  setTextSize("normal");
  setHighContrast(false);
  setReduceMotion(false);
  setReadingMode(false);
  Object.values(storageKeys).forEach((key) => window.localStorage.removeItem(key));
 }

 return (
  <div className={styles.widget} data-no-translate>
   <button
    className={styles.trigger}
    type="button"
    aria-label={t("openOptions")}
    aria-expanded={isOpen}
    aria-controls="accessibility-panel"
    onClick={() => setIsOpen((current) => !current)}
   >
    <Accessibility aria-hidden="true" size={18} />
    <span>{t("accessibility")}</span>
   </button>

   {isOpen ? (
    <div
     ref={panelRef}
     className={styles.panel}
     id="accessibility-panel"
     role="dialog"
     aria-modal="false"
     aria-labelledby="accessibility-panel-title"
    >
     <div className={styles.panelHeader}>
      <div>
       <p className={styles.eyebrow}>{t("readingComfort")}</p>
       <h2 id="accessibility-panel-title">{t("optionsTitle")}</h2>
      </div>
      <button className={styles.closeButton} type="button" aria-label={t("close")} onClick={() => setIsOpen(false)}>
       <X aria-hidden="true" size={18} />
      </button>
     </div>

     <div className={styles.statusLine} aria-live="polite">
      <span>{t("textSize")}</span>
      <strong>
       {textSize === "normal" ? t("normal") : null}
       {textSize === "large" ? t("large") : null}
       {textSize === "xlarge" ? t("xlarge") : null}
      </strong>
     </div>

     <div className={styles.actions}>
      <button type="button" onClick={increaseText} disabled={textSize === "xlarge"}>
       <Type aria-hidden="true" size={18} />
       <span>{t("increaseText")}</span>
      </button>
      <button type="button" onClick={decreaseText} disabled={textSize === "normal"}>
       <Minus aria-hidden="true" size={18} />
       <span>{t("decreaseText")}</span>
      </button>
      <button
       type="button"
       className={highContrast ? styles.active : undefined}
       aria-pressed={highContrast}
       onClick={() => setHighContrast((current) => !current)}
      >
       <Eye aria-hidden="true" size={18} />
       <span>{t("highContrast")}</span>
      </button>
      <button
       type="button"
       className={reduceMotion ? styles.active : undefined}
       aria-pressed={reduceMotion}
       onClick={() => setReduceMotion((current) => !current)}
      >
       <Sparkles aria-hidden="true" size={18} />
       <span>{t("reduceAnimations")}</span>
      </button>
      <button
       type="button"
       className={readingMode ? styles.active : undefined}
       aria-pressed={readingMode}
       onClick={() => setReadingMode((current) => !current)}
      >
       <Accessibility aria-hidden="true" size={18} />
       <span>{t("simplifiedReading")}</span>
      </button>
     </div>

     <div className={styles.footerActions}>
      <button className={styles.resetButton} type="button" onClick={resetSettings}>
       <RefreshCw aria-hidden="true" size={17} />
       <span>{t("resetDisplay")}</span>
      </button>
      <button className={styles.doneButton} type="button" onClick={() => setIsOpen(false)}>
       {t("close")}
      </button>
     </div>
    </div>
   ) : null}
  </div>
 );
}
