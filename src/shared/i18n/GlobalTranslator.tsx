"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  defaultLanguage,
  languageChangeEvent,
  languageStorageKey,
  translations,
  type LanguageCode
} from "./translations";

const textOriginals = new WeakMap<Text, string>();
const attributeNames = ["aria-label", "alt", "placeholder", "title"] as const;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getLanguage(): LanguageCode {
  if (typeof window === "undefined") return defaultLanguage;
  const stored = window.localStorage.getItem(languageStorageKey);
  if (stored && ["FR", "EN", "ES", "IT", "PT", "DE", "ZH", "AR"].includes(stored)) return stored as LanguageCode;
  return defaultLanguage;
}

function translateText(value: string, language: LanguageCode) {
  if (language === defaultLanguage) return value;

  const languageDictionary = translations[language as Exclude<LanguageCode, "FR">];
  const dictionary = language === "EN" ? languageDictionary : { ...translations.EN, ...languageDictionary };
  const normalized = normalizeText(value);
  if (!normalized) return value;

  const exact = Object.entries(dictionary).find(([source]) => normalizeText(source) === normalized);
  if (exact?.[1]) {
    const prefix = value.match(/^\s*/)?.[0] ?? "";
    const suffix = value.match(/\s*$/)?.[0] ?? "";
    return `${prefix}${exact[1]}${suffix}`;
  }

  let translated = normalized;
  for (const [source, target] of Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length)) {
    const sourceKey = normalizeText(source);
    if (!sourceKey) continue;
    translated = translated.split(sourceKey).join(target);
  }

  if (translated === normalized) return value;
  const prefix = value.match(/^\s*/)?.[0] ?? "";
  const suffix = value.match(/\s*$/)?.[0] ?? "";
  return `${prefix}${translated}${suffix}`;
}

function shouldSkipNode(node: Node) {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest("script, style, noscript, code, pre, [data-no-translate]"));
}

function translateNode(node: Node, language: LanguageCode) {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    if (shouldSkipNode(textNode)) return;

    if (!textOriginals.has(textNode)) textOriginals.set(textNode, textNode.nodeValue ?? "");
    const original = textOriginals.get(textNode) ?? "";
    const nextValue = language === defaultLanguage ? original : translateText(original, language);
    if (textNode.nodeValue !== nextValue) textNode.nodeValue = nextValue;
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as HTMLElement;
  if (element.closest("script, style, noscript, code, pre, [data-no-translate]")) return;

  const translationKey = element.dataset.i18nKey;
  if (translationKey) {
    const nextValue = language === defaultLanguage ? translationKey : translateText(translationKey, language);
    if (element.textContent !== nextValue) element.textContent = nextValue;
    return;
  }

  if (element.children.length === 0) {
    const originalKey = "data-i18n-original-text";
    const value = element.textContent ?? "";
    if (normalizeText(value)) {
      if (!element.hasAttribute(originalKey)) element.setAttribute(originalKey, value);
      const original = element.getAttribute(originalKey) ?? value;
      const nextValue = language === defaultLanguage ? original : translateText(original, language);
      if (nextValue !== value) element.textContent = nextValue;
    }
  }

  for (const attribute of attributeNames) {
    const value = element.getAttribute(attribute);
    if (!value) continue;

    const originalKey = `data-i18n-original-${attribute}`;
    if (!element.hasAttribute(originalKey)) element.setAttribute(originalKey, value);
    const original = element.getAttribute(originalKey) ?? value;
    element.setAttribute(attribute, language === defaultLanguage ? original : translateText(original, language));
  }

  for (const child of Array.from(element.childNodes)) {
    translateNode(child, language);
  }
}

function applyLanguage(language: LanguageCode) {
  const firstMain = document.querySelector("main");
  if (firstMain && !firstMain.id) firstMain.id = "main";

  document.documentElement.lang = language.toLowerCase();
  document.documentElement.dir = language === "AR" ? "rtl" : "ltr";
  translateNode(document.body, language);
}

export function GlobalTranslator() {
  const pathname = usePathname();

  useEffect(() => {
    let currentLanguage = getLanguage();
    applyLanguage(currentLanguage);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(() => applyLanguage(currentLanguage));
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    function handleLanguageChange(event: Event) {
      const detail = (event as CustomEvent<LanguageCode>).detail;
      currentLanguage = detail || getLanguage();
      applyLanguage(currentLanguage);
    }

    window.addEventListener(languageChangeEvent, handleLanguageChange);

    return () => {
      observer.disconnect();
      window.removeEventListener(languageChangeEvent, handleLanguageChange);
    };
  }, [pathname]);

  return null;
}
