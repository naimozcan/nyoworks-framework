// ═══════════════════════════════════════════════════════════════════════════════
// Export Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState, useEffect, useRef } from "react"
import type { ExportFormat, GetExportJobOutput } from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExportOptions {
  type: string
  format: ExportFormat
  filters?: Record<string, unknown>
}

interface UseExportReturn {
  startExport: (options: ExportOptions) => Promise<string | null>
  isLoading: boolean
  error: Error | null
}

interface UseExportJobReturn {
  job: GetExportJobOutput | null
  isLoading: boolean
  error: Error | null
  isPolling: boolean
  startPolling: () => void
  stopPolling: () => void
  refetch: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// useExport Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useExport(): UseExportReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const startExport = useCallback(async (options: ExportOptions): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error("Failed to create export job")
      }

      const data = await response.json()
      return data.id
    } catch (err) {
      const exportError = err instanceof Error ? err : new Error("Unknown error")
      setError(exportError)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { startExport, isLoading, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// useExportJob Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useExportJob(jobId: string | null, pollingInterval = 2000): UseExportJobReturn {
  const [job, setJob] = useState<GetExportJobOutput | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const fetchJob = useCallback(async () => {
    if (!jobId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/export/${jobId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch export job")
      }

      const data = await response.json()
      setJob({
        ...data,
        startedAt: data.startedAt ? new Date(data.startedAt) : null,
        completedAt: data.completedAt ? new Date(data.completedAt) : null,
        createdAt: new Date(data.createdAt),
      })

      if (data.status === "completed" || data.status === "failed") {
        stopPolling()
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      stopPolling()
    } finally {
      setIsLoading(false)
    }
  }, [jobId])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return

    setIsPolling(true)
    fetchJob()

    pollingRef.current = setInterval(fetchJob, pollingInterval)
  }, [fetchJob, pollingInterval])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }, [])

  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (jobId) {
      fetchJob()
    } else {
      setJob(null)
    }
  }, [jobId, fetchJob])

  return {
    job,
    isLoading,
    error,
    isPolling,
    startPolling,
    stopPolling,
    refetch: fetchJob,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useExportDownload Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseExportDownloadReturn {
  download: (jobId: string, filename?: string) => Promise<void>
  isDownloading: boolean
  error: Error | null
}

export function useExportDownload(): UseExportDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const download = useCallback(async (jobId: string, filename?: string) => {
    setIsDownloading(true)
    setError(null)

    try {
      const response = await fetch(`/api/export/${jobId}/download`)

      if (!response.ok) {
        throw new Error("Failed to download export")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const contentDisposition = response.headers.get("Content-Disposition")
      let downloadFilename = filename || `export-${jobId}`

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/)
        if (match?.[1]) {
          downloadFilename = match[1]
        }
      }

      const link = document.createElement("a")
      link.href = url
      link.download = downloadFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsDownloading(false)
    }
  }, [])

  return { download, isDownloading, error }
}
