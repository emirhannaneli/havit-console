import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { en, type MessageKey } from "./en";
import { de } from "./de";
import { es } from "./es";
import { fr } from "./fr";
import { id } from "./id";
import { it } from "./it";
import { pl } from "./pl";
import { ptBR } from "./pt-BR";
import { tr } from "./tr";
import { vi } from "./vi";
import { ru } from "./ru";
import { uk } from "./uk";
import { hi } from "./hi";
import { ja } from "./ja";
import { ko } from "./ko";
import { zhCN } from "./zh-CN";
import { zhTW } from "./zh-TW";

/**
 * Minimal i18n: flat string tables, `{name}` interpolation, `_one`/`_other` plurals via
 * `Intl.PluralRules`. React code uses `useT()`; modules outside React use `translate()`
 * with `currentLang()`. The language is kept in localStorage and applied without a reload.
 */

export type Lang = "en" | "de" | "es" | "fr" | "id" | "it" | "pl" | "pt-BR" | "tr" | "vi" | "ru" | "uk" | "hi" | "ja" | "ko" | "zh-CN" | "zh-TW";

/** Selectable languages, labelled in their own language. */
export const LANGUAGES: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "id", label: "Bahasa Indonesia" },
  { id: "it", label: "Italiano" },
  { id: "pl", label: "Polski" },
  { id: "pt-BR", label: "Português (Brasil)" },
  { id: "tr", label: "Türkçe" },
  { id: "vi", label: "Tiếng Việt" },
  { id: "ru", label: "Русский" },
  { id: "uk", label: "Українська" },
  { id: "hi", label: "हिन्दी" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "zh-CN", label: "简体中文" },
  { id: "zh-TW", label: "繁體中文" },
];

const STORAGE_KEY = "havit-console:ui.language";
const MESSAGES: Record<Lang, Record<MessageKey, string>> = {
  en,
  de,
  es,
  fr,
  id,
  it,
  pl,
  "pt-BR": ptBR,
  tr,
  vi,
  ru,
  uk,
  hi,
  ja,
  ko,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
};

export type Vars = Record<string, string | number>;

/** Keys that exist as a `_one`/`_other` pair, addressed by their base name. */
export type PluralKey = {
  [K in MessageKey]: K extends `${infer Base}_other`
    ? `${Base}_one` extends MessageKey
      ? Base
      : never
    : never;
}[MessageKey];

const isLang = (v: unknown): v is Lang => typeof v === "string" && v in MESSAGES;

/** Best supported language for a BCP 47 tag ("zh-Hant-HK" → "zh-TW", "pt-PT" → "pt-BR"). */
function matchLang(tag: string): Lang | undefined {
  const lower = tag.toLowerCase();
  const exact = LANGUAGES.find((l) => l.id.toLowerCase() === lower);
  if (exact) return exact.id;
  if (lower.startsWith("zh")) return /hant|-tw|-hk|-mo/.test(lower) ? "zh-TW" : "zh-CN";
  const base = lower.split("-")[0];
  return LANGUAGES.find((l) => l.id.toLowerCase().split("-")[0] === base)?.id;
}

export function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* storage unavailable */
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const lang = tag && matchLang(tag);
    if (lang) return lang;
  }
  return "en";
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
