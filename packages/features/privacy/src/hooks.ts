// ═══════════════════════════════════════════════════════════════════════════════
// Privacy Feature - React Hooks (GDPR/AVG Compliance)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// UI-Specific Types (Different from schema/validators types)
// ─────────────────────────────────────────────────────────────────────────────

export type UIConsentType = "necessary" | "functional" | "analytics" | "marketing" | "personalization"
export type UIConsentStatus = "granted" | "denied" | "pending"

export interface UIConsentState {
  necessary: UIConsentStatus
  functional: UIConsentStatus
  analytics: UIConsentStatus
  marketing: UIConsentStatus
  personalization: UIConsentStatus
}

export interface UICookieCategory {
  id: string
  name: string
  slug: string
  description: string
  isRequired: boolean
  isEnabled: boolean
  cookies: UICookieDefinition[]
}

export interface UICookieDefinition {
  id: string
  name: string
  domain: string | null
  description: string
  provider: string | null
  duration: string | null
  type: string
}

// ─────────────────────────────────────────────────────────────────────────────
// useCookieConsent Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseCookieConsentOptions {
  policyVersion: string
  defaultConsent?: Partial<UIConsentState>
  storageKey?: string
  onConsentChange?: (consent: UIConsentState) => void
}

const DEFAULT_CONSENT: UIConsentState = {
  necessary: "granted",
  functional: "pending",
  analytics: "pending",
  marketing: "pending",
  personalization: "pending",
}

export function useCookieConsent(options: UseCookieConsentOptions) {
  const {
    policyVersion,
    defaultConsent = {},
    storageKey = "nyoworks_consent",
    onConsentChange,
  } = options

  const [consent, setConsent] = useState<UIConsentState>(() => {
    if (typeof window === "undefined") return { ...DEFAULT_CONSENT, ...defaultConsent }

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed.version === policyVersion) {
          return parsed.consent
        }
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_CONSENT, ...defaultConsent }
  })

  const [showBanner, setShowBanner] = useState(() => {
    if (typeof window === "undefined") return false

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed.version !== policyVersion
      }
    } catch {
      // ignore
    }
    return true
  })

  const [isLoading, setIsLoading] = useState(false)

  const saveConsent = useCallback((newConsent: UIConsentState) => {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(storageKey, JSON.stringify({
        version: policyVersion,
        consent: newConsent,
        timestamp: new Date().toISOString(),
      }))
    } catch {
      // ignore
    }
  }, [policyVersion, storageKey])

  const acceptAll = useCallback(async () => {
    setIsLoading(true)
    const newConsent: UIConsentState = {
      necessary: "granted",
      functional: "granted",
      analytics: "granted",
      marketing: "granted",
      personalization: "granted",
    }
    setConsent(newConsent)
    saveConsent(newConsent)
    setShowBanner(false)
    onConsentChange?.(newConsent)
    setIsLoading(false)
  }, [saveConsent, onConsentChange])

  const denyAll = useCallback(async () => {
    setIsLoading(true)
    const newConsent: UIConsentState = {
      necessary: "granted",
      functional: "denied",
      analytics: "denied",
      marketing: "denied",
      personalization: "denied",
    }
    setConsent(newConsent)
    saveConsent(newConsent)
    setShowBanner(false)
    onConsentChange?.(newConsent)
    setIsLoading(false)
  }, [saveConsent, onConsentChange])

  const updateConsent = useCallback(async (type: UIConsentType, status: UIConsentStatus) => {
    if (type === "necessary") return

    const newConsent = { ...consent, [type]: status }
    setConsent(newConsent)
    saveConsent(newConsent)
    onConsentChange?.(newConsent)
  }, [consent, saveConsent, onConsentChange])

  const savePreferences = useCallback(async (preferences: Partial<UIConsentState>) => {
    setIsLoading(true)
    const newConsent = { ...consent, ...preferences, necessary: "granted" as const }
    setConsent(newConsent)
    saveConsent(newConsent)
    setShowBanner(false)
    onConsentChange?.(newConsent)
    setIsLoading(false)
  }, [consent, saveConsent, onConsentChange])

  const hasConsent = useCallback((type: UIConsentType): boolean => {
    return consent[type] === "granted"
  }, [consent])

  const openPreferences = useCallback(() => {
    setShowBanner(true)
  }, [])

  return {
    consent,
    showBanner,
    isLoading,
    acceptAll,
    denyAll,
    updateConsent,
    savePreferences,
    hasConsent,
    openPreferences,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDataSubjectRequest Hook
// ─────────────────────────────────────────────────────────────────────────────

export type UIDsarType = "access" | "rectification" | "erasure" | "portability" | "restriction" | "objection"
export type UIDsarStatus = "pending" | "in_progress" | "completed" | "rejected"

export interface UIDataSubjectRequest {
  id: string
  requestType: UIDsarType
  status: UIDsarStatus
  email: string
  firstName: string | null
  lastName: string | null
  description: string | null
  createdAt: Date
  deadline: Date | null
  completedAt: Date | null
}

export interface UseDataSubjectRequestOptions {
  onSubmitted?: (request: UIDataSubjectRequest) => void
  onError?: (error: Error) => void
}

export function useDataSubjectRequest(options: UseDataSubjectRequestOptions = {}) {
  const [requests, setRequests] = useState<UIDataSubjectRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const submitRequest = useCallback(async (
    requestType: UIDsarType,
    email: string,
    details?: { firstName?: string; lastName?: string; description?: string }
  ): Promise<UIDataSubjectRequest | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const request: UIDataSubjectRequest = {
        id: Date.now().toString(),
        requestType,
        status: "pending",
        email,
        firstName: details?.firstName || null,
        lastName: details?.lastName || null,
        description: details?.description || null,
        createdAt: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        completedAt: null,
      }

      setRequests((prev: UIDataSubjectRequest[]) => [request, ...prev])
      options.onSubmitted?.(request)
      return request
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to submit request")
      setError(error)
      options.onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [options])

  const verifyRequest = useCallback(async (_requestId: string, _token: string): Promise<boolean> => {
    setIsLoading(true)
    try {
      return true
    } catch {
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getRequestStatus = useCallback(async (requestId: string): Promise<UIDataSubjectRequest | null> => {
    try {
      return requests.find((r: UIDataSubjectRequest) => r.id === requestId) || null
    } catch {
      return null
    }
  }, [requests])

  return {
    requests,
    isLoading,
    error,
    submitRequest,
    verifyRequest,
    getRequestStatus,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useDataExport Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseDataExportOptions {
  onExportReady?: (downloadUrl: string) => void
  onError?: (error: Error) => void
}

export interface ExportJob {
  id: string
  status: "pending" | "processing" | "completed" | "failed"
  format: "json" | "csv" | "pdf"
  downloadUrl: string | null
  expiresAt: Date | null
  createdAt: Date
}

export function useDataExport(options: UseDataExportOptions = {}) {
  const [exportJob, setExportJob] = useState<ExportJob | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const requestExport = useCallback(async (
    format: "json" | "csv" | "pdf" = "json",
    _categories?: string[]
  ): Promise<ExportJob | null> => {
    setIsExporting(true)
    setError(null)

    try {
      const job: ExportJob = {
        id: Date.now().toString(),
        status: "processing",
        format,
        downloadUrl: null,
        expiresAt: null,
        createdAt: new Date(),
      }

      setExportJob(job)

      setTimeout(() => {
        const completedJob: ExportJob = {
          ...job,
          status: "completed",
          downloadUrl: `/api/privacy/export/${job.id}/download`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }
        setExportJob(completedJob)
        options.onExportReady?.(completedJob.downloadUrl!)
      }, 2000)

      return job
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to start export")
      setError(error)
      options.onError?.(error)
      return null
    } finally {
      setIsExporting(false)
    }
  }, [options])

  const downloadExport = useCallback(async (): Promise<boolean> => {
    if (!exportJob?.downloadUrl) return false

    try {
      window.open(exportJob.downloadUrl, "_blank")
      return true
    } catch {
      return false
    }
  }, [exportJob])

  return {
    exportJob,
    isExporting,
    error,
    requestExport,
    downloadExport,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePrivacyPolicy Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface PrivacyPolicy {
  version: string
  effectiveDate: Date
  content: string
  changelog: string | null
}

export interface UsePrivacyPolicyOptions {
  language?: string
}

export function usePrivacyPolicy(options: UsePrivacyPolicyOptions = {}) {
  const { language = "nl" } = options
  const [policy, setPolicy] = useState<PrivacyPolicy | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const fetchPolicy = async () => {
      setIsLoading(true)
      try {
        setPolicy({
          version: "1.0.0",
          effectiveDate: new Date(),
          content: "",
          changelog: null,
        })
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load privacy policy"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPolicy()
  }, [language])

  return {
    policy,
    isLoading,
    error,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAccountDeletion Hook
// ─────────────────────────────────────────────────────────────────────────────

export interface UseAccountDeletionOptions {
  onDeleted?: () => void
  onError?: (error: Error) => void
}

export function useAccountDeletion(options: UseAccountDeletionOptions = {}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [confirmationRequired, setConfirmationRequired] = useState(false)

  const requestDeletion = useCallback(async (): Promise<boolean> => {
    setConfirmationRequired(true)
    return true
  }, [])

  const confirmDeletion = useCallback(async (_email: string, _reason?: string): Promise<boolean> => {
    setIsDeleting(true)
    setError(null)

    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setConfirmationRequired(false)
      options.onDeleted?.()
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to delete account")
      setError(error)
      options.onError?.(error)
      return false
    } finally {
      setIsDeleting(false)
    }
  }, [options])

  const cancelDeletion = useCallback(() => {
    setConfirmationRequired(false)
    setError(null)
  }, [])

  return {
    isDeleting,
    error,
    confirmationRequired,
    requestDeletion,
    confirmDeletion,
    cancelDeletion,
  }
}
