// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useRef, useState } from "react"
import { TIMEOUTS, STORAGE_KEYS } from "@nyoworks/shared"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TrackOptions {
  properties?: Record<string, unknown>
}

interface AnalyticsConfig {
  apiUrl?: string
  autoTrackPageviews?: boolean
  sessionTimeout?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_KEY = STORAGE_KEYS.ANALYTICS_SESSION
const SESSION_TIMEOUT = TIMEOUTS.SESSION_TIMEOUT

function getSessionId(): string | null {
  if (typeof window === "undefined") return null

  const stored = sessionStorage.getItem(SESSION_KEY)
  if (stored) {
    const { id, timestamp } = JSON.parse(stored)
    if (Date.now() - timestamp < SESSION_TIMEOUT) {
      return id
    }
  }
  return null
}

function setSessionId(id: string): void {
  if (typeof window === "undefined") return

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ id, timestamp: Date.now() })
  )
}

function refreshSession(): void {
  const id = getSessionId()
  if (id) {
    setSessionId(id)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAnalytics Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAnalytics(config: AnalyticsConfig = {}) {
  const { apiUrl = "/api/analytics", autoTrackPageviews = true } = config
  const [sessionId, setSessionIdState] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    let existingSession = getSessionId()

    if (!existingSession) {
      fetch(`${apiUrl}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referrer: document.referrer,
          entryPage: window.location.pathname,
        }),
      })
        .then(res => res.json())
        .then(data => {
          setSessionId(data.sessionId)
          setSessionIdState(data.sessionId)
        })
        .catch(console.error)
    } else {
      setSessionIdState(existingSession)
      refreshSession()
    }

    const handleActivity = () => refreshSession()
    window.addEventListener("click", handleActivity)
    window.addEventListener("scroll", handleActivity)

    return () => {
      window.removeEventListener("click", handleActivity)
      window.removeEventListener("scroll", handleActivity)
    }
  }, [apiUrl])

  const track = useCallback(
    async (eventName: string, options: TrackOptions = {}) => {
      try {
        await fetch(`${apiUrl}/track/event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName,
            properties: options.properties,
            sessionId: getSessionId(),
          }),
        })
      } catch (error) {
        console.error("Failed to track event:", error)
      }
    },
    [apiUrl]
  )

  const trackPageview = useCallback(
    async (pathname?: string, title?: string) => {
      try {
        await fetch(`${apiUrl}/track/pageview`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pathname: pathname || window.location.pathname,
            title: title || document.title,
            referrer: document.referrer,
            sessionId: getSessionId(),
          }),
        })
      } catch (error) {
        console.error("Failed to track pageview:", error)
      }
    },
    [apiUrl]
  )

  const identify = useCallback(
    async (properties: Record<string, unknown>) => {
      try {
        await fetch(`${apiUrl}/track/identify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventName: "identify",
            properties,
            sessionId: getSessionId(),
          }),
        })
      } catch (error) {
        console.error("Failed to identify user:", error)
      }
    },
    [apiUrl]
  )

  useEffect(() => {
    if (autoTrackPageviews && sessionId) {
      trackPageview()
    }
  }, [autoTrackPageviews, sessionId, trackPageview])

  return {
    track,
    trackPageview,
    identify,
    sessionId,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// usePageview Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePageview(pathname?: string) {
  const { trackPageview } = useAnalytics({ autoTrackPageviews: false })

  useEffect(() => {
    trackPageview(pathname)
  }, [pathname, trackPageview])
}

// ─────────────────────────────────────────────────────────────────────────────
// useTrackEvent Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useTrackEvent() {
  const { track } = useAnalytics({ autoTrackPageviews: false })
  return track
}

// ─────────────────────────────────────────────────────────────────────────────
// useAnalyticsQuery Hook
// ─────────────────────────────────────────────────────────────────────────────

interface QueryParams {
  startDate: Date
  endDate: Date
  eventName?: string
  groupBy?: "hour" | "day" | "week" | "month"
  limit?: number
}

interface EventCount {
  date: string
  count: number
}

interface TopEvent {
  eventName: string
  count: number
}

interface TopPage {
  pathname: string
  count: number
}

export function useAnalyticsQuery(apiUrl = "/api/analytics") {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEventCounts = useCallback(
    async (params: QueryParams): Promise<EventCount[]> => {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams({
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          groupBy: params.groupBy || "day",
        })

        if (params.eventName) searchParams.set("eventName", params.eventName)

        const response = await fetch(`${apiUrl}/query/event-counts?${searchParams}`)
        if (!response.ok) throw new Error("Failed to fetch event counts")

        return response.json()
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [apiUrl]
  )

  const fetchTopEvents = useCallback(
    async (params: QueryParams): Promise<TopEvent[]> => {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams({
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          limit: String(params.limit || 10),
        })

        const response = await fetch(`${apiUrl}/query/top-events?${searchParams}`)
        if (!response.ok) throw new Error("Failed to fetch top events")

        return response.json()
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [apiUrl]
  )

  const fetchTopPages = useCallback(
    async (params: QueryParams): Promise<TopPage[]> => {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams({
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          limit: String(params.limit || 10),
        })

        const response = await fetch(`${apiUrl}/query/top-pages?${searchParams}`)
        if (!response.ok) throw new Error("Failed to fetch top pages")

        return response.json()
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [apiUrl]
  )

  const fetchPageviewCounts = useCallback(
    async (params: QueryParams): Promise<EventCount[]> => {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams({
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          groupBy: params.groupBy || "day",
        })

        const response = await fetch(`${apiUrl}/query/pageview-counts?${searchParams}`)
        if (!response.ok) throw new Error("Failed to fetch pageview counts")

        return response.json()
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
        return []
      } finally {
        setIsLoading(false)
      }
    },
    [apiUrl]
  )

  const fetchUniqueUsers = useCallback(
    async (params: QueryParams): Promise<{ count: number }> => {
      setIsLoading(true)
      setError(null)

      try {
        const searchParams = new URLSearchParams({
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
        })

        const response = await fetch(`${apiUrl}/query/unique-users?${searchParams}`)
        if (!response.ok) throw new Error("Failed to fetch unique users")

        return response.json()
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"))
        return { count: 0 }
      } finally {
        setIsLoading(false)
      }
    },
    [apiUrl]
  )

  return {
    isLoading,
    error,
    fetchEventCounts,
    fetchTopEvents,
    fetchTopPages,
    fetchPageviewCounts,
    fetchUniqueUsers,
  }
}
