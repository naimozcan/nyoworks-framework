// ═══════════════════════════════════════════════════════════════════════════════
// i18n Configuration
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Supported Locales
// ─────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_LOCALES = ["en", "tr", "nl"] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "en"

// ─────────────────────────────────────────────────────────────────────────────
// Locale Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const LOCALE_META: Record<Locale, { name: string; nativeName: string; direction: "ltr" | "rtl" }> = {
  en: { name: "English", nativeName: "English", direction: "ltr" },
  tr: { name: "Turkish", nativeName: "Türkçe", direction: "ltr" },
  nl: { name: "Dutch", nativeName: "Nederlands", direction: "ltr" },
}

// ─────────────────────────────────────────────────────────────────────────────
// Date/Time Formats
// ─────────────────────────────────────────────────────────────────────────────

export const DATE_FORMATS: Record<Locale, string> = {
  en: "MM/DD/YYYY",
  tr: "DD.MM.YYYY",
  nl: "DD-MM-YYYY",
}

export const TIME_FORMATS: Record<Locale, string> = {
  en: "h:mm A",
  tr: "HH:mm",
  nl: "HH:mm",
}

// ─────────────────────────────────────────────────────────────────────────────
// Currency
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CURRENCY: Record<Locale, string> = {
  en: "USD",
  tr: "TRY",
  nl: "EUR",
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale)
}

export function getLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const preferredLocales = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";")[0].trim().toLowerCase().split("-")[0])

  for (const preferred of preferredLocales) {
    if (isValidLocale(preferred)) {
      return preferred
    }
  }

  return DEFAULT_LOCALE
}
