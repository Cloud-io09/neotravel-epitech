"use client";

import { useEffect, useRef, useState } from "react";
import {
 defaultLanguage,
 languageChangeEvent,
 languageStorageKey,
 languages,
 type LanguageCode
} from "./translations";
import styles from "./LanguageSelector.module.css";

function isLanguageCode(value: string | null): value is LanguageCode {
 return Boolean(value && languages.some((language) => language.code === value));
}

function getInitialLanguage() {
 if (typeof window === "undefined") return defaultLanguage;
 const stored = window.localStorage.getItem(languageStorageKey);
 return isLanguageCode(stored) ? stored : defaultLanguage;
}

export function LanguageSelector() {
 const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(defaultLanguage);
 const menuRef = useRef<HTMLDetailsElement>(null);

 useEffect(() => {
  setCurrentLanguage(getInitialLanguage());

  function handleLanguageChange(event: Event) {
   const detail = (event as CustomEvent<LanguageCode>).detail;
   if (detail) setCurrentLanguage(detail);
  }

  window.addEventListener(languageChangeEvent, handleLanguageChange);
  return () => window.removeEventListener(languageChangeEvent, handleLanguageChange);
 }, []);

 function selectLanguage(language: LanguageCode) {
  window.localStorage.setItem(languageStorageKey, language);
  setCurrentLanguage(language);
  window.dispatchEvent(new CustomEvent(languageChangeEvent, { detail: language }));
  if (menuRef.current) menuRef.current.open = false;
 }

 const current = languages.find((language) => language.code === currentLanguage) ?? languages[0];

 return (
  <details className={styles.languageMenu} ref={menuRef} data-no-translate>
   <summary aria-label="Changer de langue">
    <span className={styles.currentFlag} aria-hidden="true">
     {current.flag}
    </span>
    <span>{current.code}</span>
   </summary>
   <div className={styles.languageList} aria-label="Choix de la langue">
    {languages.map((language) => (
     <button
      className={styles.languageOption}
      type="button"
      key={language.code}
      aria-label={language.label}
      onClick={() => selectLanguage(language.code)}
     >
      <strong>{language.code}</strong>
      <span aria-hidden="true">{language.flag}</span>
     </button>
    ))}
   </div>
  </details>
 );
}
