// ═══════════════════════════════════════════════════════════════════════════════
// Audit Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string
  tenantId: string
  userId: string | null
  action: string
  entityType: string
  entityId: string
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

interface ListResponse<T> {
  items: T[]
  total?: number
  hasMore?: boolean
}

interface AuditStats {
  total: number
  byAction: Record<string, number>
  byEntityType: Record<string, number>
}

// ─────────────────────────────────────────────────────────────────────────────
// useAuditLogs Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseAuditLogsOptions {
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  startDate?: string
  endDate?: string
  limit?: number
}

export function useAuditLogs(options: UseAuditLogsOptions = {}) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchLogs = useCallback(async (offset = 0) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("offset", String(offset))
      if (options.limit) params.set("limit", String(options.limit))
      if (options.userId) params.set("userId", options.userId)
      if (options.action) params.set("action", options.action)
      if (options.entityType) params.set("entityType", options.entityType)
      if (options.entityId) params.set("entityId", options.entityId)
      if (options.startDate) params.set("startDate", options.startDate)
      if (options.endDate) params.set("endDate", options.endDate)

      const response = await fetch(`/api/audit/logs?${params}`)
      if (!response.ok) throw new Error("Failed to fetch audit logs")

      const data: ListResponse<AuditLog> = await response.json()

      if (offset === 0) {
        setLogs(data.items)
      } else {
        setLogs((prev: AuditLog[]) => [...prev, ...data.items])
      }
      setTotal(data.total || 0)
      setHasMore(data.hasMore || false)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [
    options.userId,
    options.action,
    options.entityType,
    options.entityId,
    options.startDate,
    options.endDate,
    options.limit,
  ])

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchLogs(logs.length)
    }
  }, [fetchLogs, isLoading, hasMore, logs.length])

  return {
    logs,
    total,
    isLoading,
    error,
    hasMore,
    fetchLogs,
    loadMore,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAuditLog Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAuditLog(auditLogId: string | null) {
  const [log, setLog] = useState<AuditLog | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchLog = useCallback(async () => {
    if (!auditLogId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/audit/logs/${auditLogId}`)
      if (!response.ok) throw new Error("Failed to fetch audit log")

      const data: AuditLog = await response.json()
      setLog({
        ...data,
        createdAt: new Date(data.createdAt),
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [auditLogId])

  return {
    log,
    isLoading,
    error,
    fetchLog,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useEntityHistory Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useEntityHistory(entityType: string | null, entityId: string | null) {
  const [history, setHistory] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchHistory = useCallback(async (offset = 0, limit = 50) => {
    if (!entityType || !entityId) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        entityType,
        entityId,
        offset: String(offset),
        limit: String(limit),
      })

      const response = await fetch(`/api/audit/entity-history?${params}`)
      if (!response.ok) throw new Error("Failed to fetch entity history")

      const data: ListResponse<AuditLog> = await response.json()

      if (offset === 0) {
        setHistory(data.items)
      } else {
        setHistory((prev: AuditLog[]) => [...prev, ...data.items])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  return {
    history,
    isLoading,
    error,
    fetchHistory,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useUserActivity Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUserActivity(userId: string | null) {
  const [activity, setActivity] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchActivity = useCallback(async (options: {
    offset?: number
    limit?: number
    startDate?: string
    endDate?: string
  } = {}) => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ userId })
      if (options.offset) params.set("offset", String(options.offset))
      if (options.limit) params.set("limit", String(options.limit))
      if (options.startDate) params.set("startDate", options.startDate)
      if (options.endDate) params.set("endDate", options.endDate)

      const response = await fetch(`/api/audit/user-activity?${params}`)
      if (!response.ok) throw new Error("Failed to fetch user activity")

      const data: ListResponse<AuditLog> = await response.json()

      if (!options.offset || options.offset === 0) {
        setActivity(data.items)
      } else {
        setActivity((prev: AuditLog[]) => [...prev, ...data.items])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  return {
    activity,
    isLoading,
    error,
    fetchActivity,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAuditStats Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAuditStats() {
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/audit/stats")
      if (!response.ok) throw new Error("Failed to fetch audit stats")

      const data: AuditStats = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    stats,
    isLoading,
    error,
    fetchStats,
  }
}
