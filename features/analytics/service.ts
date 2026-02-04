// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Service
// ═══════════════════════════════════════════════════════════════════════════════

import { db, eq, and, sql, desc } from "../../core/database/client"
import { analyticsEvents, analyticsMetrics } from "./schema"
import { createLogger } from "../../core/shared/logger"
import type { AnalyticsEvent, NewAnalyticsEvent, AnalyticsMetric } from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const logger = createLogger("analytics-service")

// ─────────────────────────────────────────────────────────────────────────────
// Track Event
// ─────────────────────────────────────────────────────────────────────────────

async function track(data: NewAnalyticsEvent): Promise<AnalyticsEvent> {
  const [event] = await db
    .insert(analyticsEvents)
    .values(data)
    .returning()

  logger.debug({ event: data.event, userId: data.userId }, "Event tracked")
  return event
}

async function trackBatch(events: NewAnalyticsEvent[]): Promise<number> {
  if (events.length === 0) return 0

  const result = await db.insert(analyticsEvents).values(events).returning()
  logger.debug({ count: result.length }, "Batch events tracked")
  return result.length
}

// ─────────────────────────────────────────────────────────────────────────────
// Query Events
// ─────────────────────────────────────────────────────────────────────────────

async function getEvents(
  tenantId: string,
  options: {
    event?: string
    userId?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  } = {}
): Promise<AnalyticsEvent[]> {
  const { event, userId, limit = 100, offset = 0 } = options

  const conditions = [eq(analyticsEvents.tenantId, tenantId)]

  if (event) conditions.push(eq(analyticsEvents.event, event))
  if (userId) conditions.push(eq(analyticsEvents.userId, userId))

  return db
    .select()
    .from(analyticsEvents)
    .where(and(...conditions))
    .orderBy(desc(analyticsEvents.timestamp))
    .limit(limit)
    .offset(offset)
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics
// ─────────────────────────────────────────────────────────────────────────────

async function incrementMetric(
  tenantId: string,
  metric: string,
  date: Date,
  increment: number = 1,
  dimension?: { name: string; value: string }
): Promise<void> {
  const dateStr = date.toISOString().split("T")[0]

  await db
    .insert(analyticsMetrics)
    .values({
      tenantId,
      metric,
      dimension: dimension?.name,
      dimensionValue: dimension?.value,
      value: increment,
      date: dateStr,
    })
    .onConflictDoUpdate({
      target: [
        analyticsMetrics.tenantId,
        analyticsMetrics.metric,
        analyticsMetrics.dimension,
        analyticsMetrics.dimensionValue,
        analyticsMetrics.date,
      ],
      set: {
        value: sql`${analyticsMetrics.value} + ${increment}`,
        updatedAt: new Date(),
      },
    })
}

async function getMetrics(
  tenantId: string,
  metric: string,
  options: {
    startDate: Date
    endDate: Date
    dimension?: string
  }
): Promise<AnalyticsMetric[]> {
  const conditions = [
    eq(analyticsMetrics.tenantId, tenantId),
    eq(analyticsMetrics.metric, metric),
  ]

  if (options.dimension) {
    conditions.push(eq(analyticsMetrics.dimension, options.dimension))
  }

  return db
    .select()
    .from(analyticsMetrics)
    .where(and(...conditions))
    .orderBy(analyticsMetrics.date)
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Stats
// ─────────────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalEvents: number
  uniqueUsers: number
  topEvents: Array<{ event: string; count: number }>
}

async function getDashboardStats(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<DashboardStats> {
  const events = await db
    .select()
    .from(analyticsEvents)
    .where(eq(analyticsEvents.tenantId, tenantId))

  const uniqueUsers = new Set(events.filter((e) => e.userId).map((e) => e.userId))

  const eventCounts = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.event] = (acc[e.event] || 0) + 1
    return acc
  }, {})

  const topEvents = Object.entries(eventCounts)
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalEvents: events.length,
    uniqueUsers: uniqueUsers.size,
    topEvents,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsService = {
  track,
  trackBatch,
  getEvents,
  incrementMetric,
  getMetrics,
  getDashboardStats,
}
