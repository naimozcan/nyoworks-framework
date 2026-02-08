// ═══════════════════════════════════════════════════════════════════════════════
// Search Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SearchResult {
  id: string
  entityType: string
  entityId: string
  content: string
  headline: string | null
  rank: number
  metadata: Record<string, unknown> | null
}

interface SearchOptions {
  entityTypes?: string[]
  limit?: number
  highlight?: boolean
  highlightTag?: string
  debounceMs?: number
}

interface UseSearchReturn {
  query: string
  setQuery: (query: string) => void
  results: SearchResult[]
  isLoading: boolean
  error: Error | null
  total: number
  hasMore: boolean
  search: () => Promise<void>
  loadMore: () => Promise<void>
  clear: () => void
}

interface UseSearchResultsOptions {
  entityTypes?: string[]
  limit?: number
  highlight?: boolean
}

interface UseSearchResultsReturn {
  results: SearchResult[]
  isLoading: boolean
  error: Error | null
  total: number
  hasMore: boolean
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// useSearch Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSearch(options: SearchOptions = {}): UseSearchReturn {
  const {
    entityTypes,
    limit = 20,
    highlight = true,
    highlightTag = "<mark>",
    debounceMs = 300,
  } = options

  const [query, setQueryState] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const search = useCallback(async (searchQuery?: string, searchOffset = 0) => {
    const q = searchQuery ?? query
    if (!q.trim()) {
      setResults([])
      setTotal(0)
      setHasMore(false)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        query: q,
        limit: String(limit),
        offset: String(searchOffset),
        highlight: String(highlight),
        highlightTag,
      })

      if (entityTypes && entityTypes.length > 0) {
        entityTypes.forEach(type => params.append("entityTypes", type))
      }

      const response = await fetch(`/api/search?${params}`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()

      if (searchOffset === 0) {
        setResults(data.items)
      } else {
        setResults(prev => [...prev, ...data.items])
      }

      setTotal(data.total)
      setHasMore(data.hasMore)
      setOffset(searchOffset + limit)
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return
      }
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [query, entityTypes, limit, highlight, highlightTag])

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery)

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (!newQuery.trim()) {
      setResults([])
      setTotal(0)
      setHasMore(false)
      setOffset(0)
      return
    }

    debounceTimeoutRef.current = setTimeout(() => {
      search(newQuery, 0)
    }, debounceMs)
  }, [debounceMs, search])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await search(query, offset)
  }, [hasMore, isLoading, query, offset, search])

  const clear = useCallback(() => {
    setQueryState("")
    setResults([])
    setTotal(0)
    setHasMore(false)
    setOffset(0)
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    total,
    hasMore,
    search: () => search(query, 0),
    loadMore,
    clear,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSearchResults Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useSearchResults(
  query: string,
  options: UseSearchResultsOptions = {}
): UseSearchResultsReturn {
  const { entityTypes, limit = 20, highlight = true } = options

  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchResults = useCallback(async (searchOffset = 0) => {
    if (!query.trim()) {
      setResults([])
      setTotal(0)
      setHasMore(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        query,
        limit: String(limit),
        offset: String(searchOffset),
        highlight: String(highlight),
      })

      if (entityTypes && entityTypes.length > 0) {
        entityTypes.forEach(type => params.append("entityTypes", type))
      }

      const response = await fetch(`/api/search?${params}`)

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()

      if (searchOffset === 0) {
        setResults(data.items)
      } else {
        setResults(prev => [...prev, ...data.items])
      }

      setTotal(data.total)
      setHasMore(data.hasMore)
      setOffset(searchOffset + limit)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [query, entityTypes, limit, highlight])

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return
    await fetchResults(offset)
  }, [hasMore, isLoading, offset, fetchResults])

  const refetch = useCallback(async () => {
    setOffset(0)
    await fetchResults(0)
  }, [fetchResults])

  useEffect(() => {
    setOffset(0)
    fetchResults(0)
  }, [query, entityTypes?.join(","), limit, highlight])

  return {
    results,
    isLoading,
    error,
    total,
    hasMore,
    loadMore,
    refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useIndexDocument Hook
// ─────────────────────────────────────────────────────────────────────────────

interface IndexDocumentOptions {
  entityType: string
  entityId: string
  content: string
  metadata?: Record<string, unknown>
}

interface UseIndexDocumentReturn {
  index: (options: IndexDocumentOptions) => Promise<void>
  remove: (entityType: string, entityId: string) => Promise<void>
  isLoading: boolean
  error: Error | null
}

export function useIndexDocument(): UseIndexDocumentReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const index = useCallback(async (options: IndexDocumentOptions) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/search/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      })

      if (!response.ok) {
        throw new Error("Failed to index document")
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const remove = useCallback(async (entityType: string, entityId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/search/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId }),
      })

      if (!response.ok) {
        throw new Error("Failed to remove document from index")
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { index, remove, isLoading, error }
}

// ─────────────────────────────────────────────────────────────────────────────
// useSearchSuggestions Hook
// ─────────────────────────────────────────────────────────────────────────────

interface Suggestion {
  text: string
  entityType: string
  count: number
}

interface UseSearchSuggestionsOptions {
  entityTypes?: string[]
  limit?: number
  debounceMs?: number
}

interface UseSearchSuggestionsReturn {
  suggestions: Suggestion[]
  isLoading: boolean
  error: Error | null
  getSuggestions: (query: string) => void
  clear: () => void
}

export function useSearchSuggestions(
  options: UseSearchSuggestionsOptions = {}
): UseSearchSuggestionsReturn {
  const { entityTypes, limit = 5, debounceMs = 200 } = options

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getSuggestions = useCallback((query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    if (!query.trim()) {
      setSuggestions([])
      return
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          query,
          limit: String(limit),
        })

        if (entityTypes && entityTypes.length > 0) {
          entityTypes.forEach(type => params.append("entityTypes", type))
        }

        const response = await fetch(`/api/search/suggest?${params}`)

        if (!response.ok) {
          throw new Error("Failed to get suggestions")
        }

        const data = await response.json()
        setSuggestions(data.suggestions)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)
  }, [entityTypes, limit, debounceMs])

  const clear = useCallback(() => {
    setSuggestions([])
    setError(null)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return { suggestions, isLoading, error, getSuggestions, clear }
}
