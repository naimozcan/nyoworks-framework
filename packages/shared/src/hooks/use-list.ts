// ═══════════════════════════════════════════════════════════════════════════════
// Shared Hook - useList
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListState<T> {
  items: T[]
  total: number
  hasMore: boolean
  isLoading: boolean
  error: Error | null
}

export interface ListParams {
  limit?: number
  offset?: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface UseListReturn<T, TParams extends ListParams = ListParams> extends ListState<T> {
  fetch: (params?: TParams) => Promise<void>
  fetchMore: () => Promise<void>
  reset: () => void
  setItems: (items: T[]) => void
  addItem: (item: T, position?: "start" | "end") => void
  updateItem: (id: string, updater: (item: T) => T) => void
  removeItem: (id: string) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useList<T extends { id: string }, TParams extends ListParams = ListParams>(
  fetchFn: (params: TParams) => Promise<{ items: T[]; total: number; hasMore?: boolean }>
): UseListReturn<T, TParams> {
  const [state, setState] = useState<ListState<T>>({
    items: [],
    total: 0,
    hasMore: false,
    isLoading: false,
    error: null,
  })

  const [lastParams, setLastParams] = useState<TParams | null>(null)

  const fetch = useCallback(async (params?: TParams) => {
    const fetchParams = params ?? ({ limit: 20, offset: 0 } as TParams)
    setLastParams(fetchParams)
    setState((prev: ListState<T>) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await fetchFn(fetchParams)
      setState({
        items: result.items,
        total: result.total,
        hasMore: result.hasMore ?? result.items.length === (fetchParams.limit ?? 20),
        isLoading: false,
        error: null,
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setState((prev: ListState<T>) => ({ ...prev, isLoading: false, error }))
    }
  }, [fetchFn])

  const fetchMore = useCallback(async () => {
    if (!lastParams || state.isLoading || !state.hasMore) return

    const nextParams = {
      ...lastParams,
      offset: (lastParams.offset ?? 0) + (lastParams.limit ?? 20),
    } as TParams

    setLastParams(nextParams)
    setState((prev: ListState<T>) => ({ ...prev, isLoading: true, error: null }))

    try {
      const result = await fetchFn(nextParams)
      setState((prev: ListState<T>) => ({
        items: [...prev.items, ...result.items],
        total: result.total,
        hasMore: result.hasMore ?? result.items.length === (nextParams.limit ?? 20),
        isLoading: false,
        error: null,
      }))
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error")
      setState((prev: ListState<T>) => ({ ...prev, isLoading: false, error }))
    }
  }, [fetchFn, lastParams, state.isLoading, state.hasMore])

  const reset = useCallback(() => {
    setState({
      items: [],
      total: 0,
      hasMore: false,
      isLoading: false,
      error: null,
    })
    setLastParams(null)
  }, [])

  const setItems = useCallback((items: T[]) => {
    setState((prev: ListState<T>) => ({ ...prev, items }))
  }, [])

  const addItem = useCallback((item: T, position: "start" | "end" = "end") => {
    setState((prev: ListState<T>) => ({
      ...prev,
      items: position === "start" ? [item, ...prev.items] : [...prev.items, item],
      total: prev.total + 1,
    }))
  }, [])

  const updateItem = useCallback((id: string, updater: (item: T) => T) => {
    setState((prev: ListState<T>) => ({
      ...prev,
      items: prev.items.map((item: T) => (item.id === id ? updater(item) : item)),
    }))
  }, [])

  const removeItem = useCallback((id: string) => {
    setState((prev: ListState<T>) => ({
      ...prev,
      items: prev.items.filter((item: T) => item.id !== id),
      total: prev.total - 1,
    }))
  }, [])

  return {
    ...state,
    fetch,
    fetchMore,
    reset,
    setItems,
    addItem,
    updateItem,
    removeItem,
  }
}
