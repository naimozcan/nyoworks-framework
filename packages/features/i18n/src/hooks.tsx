// ═══════════════════════════════════════════════════════════════════════════════
// i18n Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect, createContext, useContext } from "react"
import type { ReactNode } from "react"
import { nl } from "./locales/nl.js"
import { en } from "./locales/en.js"
import { tr } from "./locales/tr.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Locale = "nl" | "en" | "tr"

export interface TranslationStrings {
  common: Record<string, string>
  auth: Record<string, string>
  validation: Record<string, string>
  privacy: {
    cookieBanner: Record<string, string>
    categories: Record<string, Record<string, string>>
    dsar: Record<string, string>
  }
  messaging: Record<string, string>
  support: Record<string, string>
  errors: Record<string, string>
  dates: Record<string, string>
  pagination: Record<string, string>
}

export type Translations = TranslationStrings

export interface I18nContextValue {
  locale: Locale
  t: Translations
  setLocale: (locale: Locale) => void
  formatMessage: (key: string, params?: Record<string, string | number>) => string
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (amount: number, currency?: string) => string
}

// ─────────────────────────────────────────────────────────────────────────────
// Translations Map
// ─────────────────────────────────────────────────────────────────────────────

const translations: Record<Locale, TranslationStrings> = {
  nl: nl as unknown as TranslationStrings,
  en: en as unknown as TranslationStrings,
  tr: tr as unknown as TranslationStrings,
}

const localeNames: Record<Locale, string> = {
  nl: "Nederlands",
  en: "English",
  tr: "Türkçe",
}

const localeFlags: Record<Locale, string> = {
  nl: "🇳🇱",
  en: "🇬🇧",
  tr: "🇹🇷",
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue | null>(null)

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface I18nProviderProps {
  children: ReactNode
  defaultLocale?: Locale
  storageKey?: string
}

export function I18nProvider({ children, defaultLocale = "nl", storageKey = "nyoworks_locale" }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return defaultLocale
    const stored = localStorage.getItem(storageKey)
    if (stored && (stored === "nl" || stored === "en" || stored === "tr")) {
      return stored
    }
    const browserLocale = navigator.language.split("-")[0]
    if (browserLocale === "nl" || browserLocale === "en" || browserLocale === "tr") {
      return browserLocale
    }
    return defaultLocale
  })

  const t = translations[locale]

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, newLocale)
      document.documentElement.lang = newLocale
    }
  }, [storageKey])

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.lang = locale
    }
  }, [locale])

  const formatMessage = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split(".")
    let value: unknown = t
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key
      }
    }
    if (typeof value !== "string") return key
    if (!params) return value
    return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`))
  }, [t])

  const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions): string => {
    return new Intl.DateTimeFormat(locale, options).format(date)
  }, [locale])

  const formatNumber = useCallback((num: number, options?: Intl.NumberFormatOptions): string => {
    return new Intl.NumberFormat(locale, options).format(num)
  }, [locale])

  const formatCurrency = useCallback((amount: number, currency = "EUR"): string => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount)
  }, [locale])

  const value: I18nContextValue = {
    locale,
    t,
    setLocale,
    formatMessage,
    formatDate,
    formatNumber,
    formatCurrency,
  }

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider")
  }
  return context
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Hooks
// ─────────────────────────────────────────────────────────────────────────────

export function useTranslation() {
  const { t, formatMessage } = useI18n()
  return { t, formatMessage }
}

export function useLocale() {
  const { locale, setLocale } = useI18n()
  return { locale, setLocale, localeNames, localeFlags }
}

export function useFormatters() {
  const { formatDate, formatNumber, formatCurrency, locale } = useI18n()
  return { formatDate, formatNumber, formatCurrency, locale }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { translations, localeNames, localeFlags }
export { nl, en, tr }
