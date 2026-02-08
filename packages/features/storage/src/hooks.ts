// ═══════════════════════════════════════════════════════════════════════════════
// Storage Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState, useRef } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UploadOptions {
  file: File
  folder?: string
  isPublic?: boolean
  metadata?: Record<string, unknown>
  onProgress?: (progress: number) => void
}

interface UploadResult {
  fileId: string
  url: string
  key: string
}

interface FileInfo {
  id: string
  key: string
  filename: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl: string | null
  isPublic: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
}

interface ListFilesOptions {
  folder?: string
  mimeType?: string
  isPublic?: boolean
  limit?: number
  offset?: number
  sortBy?: "createdAt" | "filename" | "size"
  sortOrder?: "asc" | "desc"
}

// ─────────────────────────────────────────────────────────────────────────────
// useUpload Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const upload = useCallback(async (options: UploadOptions): Promise<UploadResult | null> => {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    abortControllerRef.current = new AbortController()

    try {
      const requestResponse = await fetch("/api/storage/request-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: options.file.name,
          mimeType: options.file.type,
          size: options.file.size,
          folder: options.folder,
          isPublic: options.isPublic,
          metadata: options.metadata,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!requestResponse.ok) {
        throw new Error("Failed to request upload URL")
      }

      const { fileId, presignedUrl, key } = await requestResponse.json()

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setProgress(percent)
            options.onProgress?.(percent)
          }
        })

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Upload failed"))
        })

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload cancelled"))
        })

        xhr.open("PUT", presignedUrl)
        xhr.setRequestHeader("Content-Type", options.file.type)
        xhr.send(options.file)

        abortControllerRef.current?.signal.addEventListener("abort", () => {
          xhr.abort()
        })
      })

      const confirmResponse = await fetch("/api/storage/confirm-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId }),
        signal: abortControllerRef.current.signal,
      })

      if (!confirmResponse.ok) {
        throw new Error("Failed to confirm upload")
      }

      const { file } = await confirmResponse.json()

      return {
        fileId: file.id,
        url: file.url,
        key,
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setError(new Error("Upload cancelled"))
      } else {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      }
      return null
    } finally {
      setIsUploading(false)
      abortControllerRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { upload, cancel, isUploading, progress, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// useFiles Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useFiles() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchFiles = useCallback(async (options: ListFilesOptions = {}) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.folder) params.set("folder", options.folder)
      if (options.mimeType) params.set("mimeType", options.mimeType)
      if (typeof options.isPublic === "boolean") params.set("isPublic", String(options.isPublic))
      if (options.limit) params.set("limit", String(options.limit))
      if (options.offset) params.set("offset", String(options.offset))
      if (options.sortBy) params.set("sortBy", options.sortBy)
      if (options.sortOrder) params.set("sortOrder", options.sortOrder)

      const response = await fetch(`/api/storage/files?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to fetch files")
      }

      const data = await response.json()
      setFiles(data.files.map((f: FileInfo) => ({
        ...f,
        createdAt: new Date(f.createdAt),
      })))
      setHasMore(data.hasMore)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const response = await fetch(`/api/storage/files/${fileId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete file")
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileId))
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      return false
    }
  }, [])

  return { files, isLoading, error, hasMore, fetchFiles, deleteFile }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePresignedUrl Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePresignedUrl() {
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getUrl = useCallback(async (fileId: string, expiresIn = 3600) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ expiresIn: String(expiresIn) })
      const response = await fetch(`/api/storage/files/${fileId}/url?${params.toString()}`)

      if (!response.ok) {
        throw new Error("Failed to get presigned URL")
      }

      const data = await response.json()
      setUrl(data.url)
      return data.url
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { url, isLoading, error, getUrl }
}

// ─────────────────────────────────────────────────────────────────────────────
// useFileUploadProgress Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UploadQueueItem {
  id: string
  file: File
  progress: number
  status: "pending" | "uploading" | "completed" | "error"
  error?: string
  result?: UploadResult
}

export function useFileUploadQueue() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const addToQueue = useCallback((files: File[]) => {
    const newItems: UploadQueueItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      progress: 0,
      status: "pending",
    }))
    setQueue((prev) => [...prev, ...newItems])
    return newItems.map((item) => item.id)
  }, [])

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status !== "completed"))
  }, [])

  const processQueue = useCallback(async (options: Omit<UploadOptions, "file" | "onProgress"> = {}) => {
    setIsProcessing(true)

    const pendingItems = queue.filter((item) => item.status === "pending")

    for (const item of pendingItems) {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" as const } : q))
      )

      try {
        const requestResponse = await fetch("/api/storage/request-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: item.file.name,
            mimeType: item.file.type,
            size: item.file.size,
            folder: options.folder,
            isPublic: options.isPublic,
            metadata: options.metadata,
          }),
        })

        if (!requestResponse.ok) {
          throw new Error("Failed to request upload URL")
        }

        const { fileId, presignedUrl, key } = await requestResponse.json()

        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100)
              setQueue((prev) =>
                prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
              )
            }
          })

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve()
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`))
            }
          })

          xhr.addEventListener("error", () => reject(new Error("Upload failed")))
          xhr.open("PUT", presignedUrl)
          xhr.setRequestHeader("Content-Type", item.file.type)
          xhr.send(item.file)
        })

        const confirmResponse = await fetch("/api/storage/confirm-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId }),
        })

        if (!confirmResponse.ok) {
          throw new Error("Failed to confirm upload")
        }

        const { file } = await confirmResponse.json()

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "completed" as const,
                  progress: 100,
                  result: { fileId: file.id, url: file.url, key },
                }
              : q
          )
        )
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Unknown error",
                }
              : q
          )
        )
      }
    }

    setIsProcessing(false)
  }, [queue])

  return {
    queue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearCompleted,
    processQueue,
  }
}
