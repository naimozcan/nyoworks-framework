// ═══════════════════════════════════════════════════════════════════════════════
// Shared Hook - useFetch
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface FetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown
}

export interface UseFetchState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

export interface UseFetchReturn<T> extends UseFetchState<T> {
  fetch: (url: string, options?: FetchOptions) => Promise<T | null>
  mutate: (url: string, options?: FetchOptions) => Promise<T | null>
  reset: () => void
  setData: (data: T | null) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useFetch<T>(): UseFetchReturn<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const executeFetch = useCallback(async (url: string, options: FetchOptions = {}): Promise<T | null> => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()

    setState((prev: UseFetchState<T>) => ({ ...prev, isLoading: true, error: null }))

    try {
      const { body, ...rest } = options
      const response = await globalThis.fetch(url, {
        ...rest,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
          "Content-Type": "application/json",
          ...rest.headers,
        },
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error((errorBody as { message?: string }).message || `Request failed with status ${response.status}`)
      }

      const data = await response.json()
      setState({ data: data as T, isLoading: false, error: null })
      return data as T
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return null
      }
      const error = err instanceof Error ? err : new Error("Unknown error")
      setState((prev: UseFetchState<T>) => ({ ...prev, isLoading: false, error }))
      return null
    }
  }, [])

  const mutate = useCallback(async (url: string, options: FetchOptions = {}): Promise<T | null> => {
    return executeFetch(url, { method: "POST", ...options })
  }, [executeFetch])

  const reset = useCallback(() => {
    abortControllerRef.current?.abort()
    setState({ data: null, isLoading: false, error: null })
  }, [])

  const setData = useCallback((data: T | null) => {
    setState((prev: UseFetchState<T>) => ({ ...prev, data }))
  }, [])

  return {
    ...state,
    fetch: executeFetch,
    mutate,
    reset,
    setData,
  }
}
