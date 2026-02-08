// ═══════════════════════════════════════════════════════════════════════════════
// Shared Hook - useAsync
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseAsyncState<T> {
  data: T | null
  isLoading: boolean
  error: Error | null
}

export interface UseAsyncReturn<T, TInput = void> extends UseAsyncState<T> {
  execute: TInput extends void ? () => Promise<T | null> : (input: TInput) => Promise<T | null>
  reset: () => void
  setData: (data: T | null) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAsync<T, TInput = void>(
  asyncFn: TInput extends void ? () => Promise<T> : (input: TInput) => Promise<T>
): UseAsyncReturn<T, TInput> {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
  })

  const mountedRef = useRef(true)

  const execute = useCallback(
    async (input?: TInput): Promise<T | null> => {
      setState((prev: UseAsyncState<T>) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await (asyncFn as (input?: TInput) => Promise<T>)(input)
        if (mountedRef.current) {
          setState({ data: result, isLoading: false, error: null })
        }
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error")
        if (mountedRef.current) {
          setState((prev: UseAsyncState<T>) => ({ ...prev, isLoading: false, error }))
        }
        return null
      }
    },
    [asyncFn]
  ) as UseAsyncReturn<T, TInput>["execute"]

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null })
  }, [])

  const setData = useCallback((data: T | null) => {
    setState((prev: UseAsyncState<T>) => ({ ...prev, data }))
  }, [])

  return {
    ...state,
    execute,
    reset,
    setData,
  }
}
