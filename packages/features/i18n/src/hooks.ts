// ═══════════════════════════════════════════════════════════════════════════════
// i18n Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState, useEffect, createContext, useContext } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LocaleInfo {
  code: string
  name: string
  nativeName: string
  isDefault: boolean
  isEnabled: boolean
}

interface TranslationOptions {
  count?: number
  defaultValue?: string
  [key: string]: string | number | undefined
}

interface I18nContextValue {
  locale: string
  locales: LocaleInfo[]
  setLocale: (locale: string) => void
  isLoading: boolean
  error: Error | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error("useI18nContext must be used within I18nProvider")
  }
  return context
}

export { I18nContext }

// ─────────────────────────────────────────────────────────────────────────────
// useLocale Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseLocaleOptions {
  defaultLocale?: string
  storageKey?: string
}

export function useLocale(options: UseLocaleOptions = {}) {
  const { defaultLocale = "en", storageKey = "nyoworks_locale" } = options
  const [locale, setLocaleState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey)
      if (stored) return stored
    }
    return defaultLocale
  })
  const [isLoading] = useState(false)
  const [error] = useState<Error | null>(null)

  const setLocale = useCallback((newLocale: string) => {
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

  return {
    locale,
    setLocale,
    isLoading,
    error,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useLocales Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseLocalesOptions {
  enabledOnly?: boolean
}

export function useLocales(options: UseLocalesOptions = {}) {
  const { enabledOnly = true } = options
  const [locales, setLocales] = useState<LocaleInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLocales = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (enabledOnly) params.set("enabledOnly", "true")

      const response = await fetch(`/api/i18n/locales?${params}`)
      if (!response.ok) throw new Error("Failed to fetch locales")

      const data: LocaleInfo[] = await response.json()
      setLocales(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [enabledOnly])

  const getDefaultLocale = useCallback(() => {
    return locales.find((l: LocaleInfo) => l.isDefault) || locales[0] || null
  }, [locales])

  return {
    locales,
    isLoading,
    error,
    fetchLocales,
    getDefaultLocale,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTranslation Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseTranslationOptions {
  namespace?: string
  locale?: string
  fallbackLocale?: string
}

export function useTranslation(options: UseTranslationOptions = {}) {
  const { namespace = "common", locale: localeOverride, fallbackLocale = "en" } = options
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const context = useContext(I18nContext)
  const locale = localeOverride || context?.locale || fallbackLocale

  const fetchTranslations = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("locale", locale)
      params.set("namespace", namespace)

      const response = await fetch(`/api/i18n/translations?${params}`)
      if (!response.ok) throw new Error("Failed to fetch translations")

      const data: Record<string, string> = await response.json()
      setTranslations(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [locale, namespace])

  useEffect(() => {
    fetchTranslations()
  }, [fetchTranslations])

  const t = useCallback((key: string, optionsOrDefault?: TranslationOptions | string): string => {
    const opts = typeof optionsOrDefault === "string"
      ? { defaultValue: optionsOrDefault }
      : optionsOrDefault || {}

    let value = translations[key]

    if (!value) {
      return opts.defaultValue || key
    }

    if (opts.count !== undefined) {
      const pluralKey = opts.count === 1 ? `${key}_one` : `${key}_other`
      if (translations[pluralKey]) {
        value = translations[pluralKey]
      }
    }

    const interpolationKeys = Object.keys(opts).filter(
      (k) => k !== "count" && k !== "defaultValue"
    )

    for (const k of interpolationKeys) {
      const regex = new RegExp(`{{\\s*${k}\\s*}}`, "g")
      value = value.replace(regex, String(opts[k] || ""))
    }

    if (opts.count !== undefined) {
      value = value.replace(/\{\{\s*count\s*\}\}/g, String(opts.count))
    }

    return value
  }, [translations])

  const exists = useCallback((key: string): boolean => {
    return key in translations
  }, [translations])

  return {
    t,
    exists,
    translations,
    isLoading,
    error,
    locale,
    namespace,
    refetch: fetchTranslations,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useTranslationAdmin Hook
// ─────────────────────────────────────────────────────────────────────────────

interface TranslationItem {
  id: string
  locale: string
  namespace: string
  key: string
  value: string
  createdAt: Date
  updatedAt: Date
}

interface UseTranslationAdminOptions {
  locale?: string
  namespace?: string
  limit?: number
}

export function useTranslationAdmin(options: UseTranslationAdminOptions = {}) {
  const { locale, namespace, limit = 50 } = options
  const [items, setItems] = useState<TranslationItem[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchTranslations = useCallback(async (offset = 0, search?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("limit", String(limit))
      params.set("offset", String(offset))
      if (locale) params.set("locale", locale)
      if (namespace) params.set("namespace", namespace)
      if (search) params.set("search", search)

      const response = await fetch(`/api/i18n/translations/list?${params}`)
      if (!response.ok) throw new Error("Failed to fetch translations")

      const data = await response.json()

      if (offset === 0) {
        setItems(data.items)
      } else {
        setItems((prev: TranslationItem[]) => [...prev, ...data.items])
      }
      setTotal(data.total)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [locale, namespace, limit])

  const addTranslation = useCallback(async (data: {
    locale: string
    namespace?: string
    key: string
    value: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/i18n/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to add translation")

      const item: TranslationItem = await response.json()
      setItems((prev: TranslationItem[]) => [item, ...prev])
      setTotal((prev: number) => prev + 1)
      return item
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateTranslation = useCallback(async (translationId: string, value: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/i18n/translations/${translationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      })

      if (!response.ok) throw new Error("Failed to update translation")

      const item: TranslationItem = await response.json()
      setItems((prev: TranslationItem[]) => prev.map((i: TranslationItem) => (i.id === translationId ? item : i)))
      return item
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteTranslation = useCallback(async (translationId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/i18n/translations/${translationId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete translation")

      setItems((prev: TranslationItem[]) => prev.filter((i: TranslationItem) => i.id !== translationId))
      setTotal((prev: number) => prev - 1)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    items,
    total,
    isLoading,
    error,
    fetchTranslations,
    addTranslation,
    updateTranslation,
    deleteTranslation,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useNamespaces Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useNamespaces(locale?: string) {
  const [namespaces, setNamespaces] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchNamespaces = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (locale) params.set("locale", locale)

      const response = await fetch(`/api/i18n/namespaces?${params}`)
      if (!response.ok) throw new Error("Failed to fetch namespaces")

      const data: string[] = await response.json()
      setNamespaces(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [locale])

  return {
    namespaces,
    isLoading,
    error,
    fetchNamespaces,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

export function formatLocale(code: string): string {
  const parts = code.split("-")
  const lang = parts[0] || ""
  const region = parts[1]
  if (region) {
    return `${lang.toLowerCase()}-${region.toUpperCase()}`
  }
  return lang.toLowerCase()
}

export function parseLocale(code: string): { language: string; region?: string } {
  const parts = code.split("-")
  const language = parts[0] || ""
  const region = parts[1]
  return {
    language: language.toLowerCase(),
    region: region?.toUpperCase(),
  }
}

export function isRTL(locale: string): boolean {
  const rtlLocales = ["ar", "he", "fa", "ur", "yi", "ps", "sd", "ug", "ku"]
  const { language } = parseLocale(locale)
  return rtlLocales.includes(language)
}
