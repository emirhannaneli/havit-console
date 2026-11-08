import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type MessageKey } from "./en";
import { tr } from "./tr";

/**
 * Minimal i18n: flat string tables, `{name}` interpolation, `_one`/`_other` plurals via
 * `Intl.PluralRules`. React code uses `useT()`; modules outside React use `translate()`
 * with `currentLang()`. The language is kept in localStorage and applied without a reload.
 */

export type Lang = "en" | "tr";

export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "tr", label: "Türkçe" },
];

const STORAGE_KEY = "havit-console:ui.language";
const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, tr };

export type Vars = Record<string, string | number>;

/** Keys that exist as a `_one`/`_other` pair, addressed by their base name. */
export type PluralKey = {
  [K in MessageKey]: K extends `${infer Base}_other`
    ? `${Base}_one` extends MessageKey
      ? Base
      : never
    : never;
}[MessageKey];

export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "tr") return stored;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith("tr") ? "tr" : "en";
}

let current: Lang = detectLang();

/** Current language for code that runs outside React (state modules, helpers). */
export const currentLang = (): Lang => current;

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    name in vars ? String(vars[name]) : m
  );
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  return interpolate(MESSAGES[lang][key] ?? en[key] ?? key, vars);
}

export function translatePlural(lang: Lang, key: PluralKey, count: number, vars?: Vars): string {
  const category = new Intl.PluralRules(lang).select(count) === "one" ? "one" : "other";
  return translate(lang, `${key}_${category}` as MessageKey, { count, ...vars });
}

/** Shorthand for non-React modules: current language. */
export const tr$ = (key: MessageKey, vars?: Vars) => translate(current, key, vars);

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  tp: (key: PluralKey, count: number, vars?: Vars) => string;
}

const Ctx = createContext<I18nValue | null>(null);

function applyDocumentLang(lang: Lang) {
  document.documentElement.lang = lang;
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(current);

  useEffect(() => {
    applyDocumentLang(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    current = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable: lasts for this session */
    }
    setLangState(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      tp: (key, count, vars) => translatePlural(lang, key, count, vars),
    }),
    [lang, setLang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useT(): I18nValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useT must be used inside I18nProvider");
  return v;
}

export type { MessageKey };
