// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Events Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm"
import { analyticsEvents, type AnalyticsEvent, type NewAnalyticsEvent } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface EventQueryOptions {
  startDate: Date
  endDate: Date
  eventName?: string
  limit?: number
}

export interface DateCount {
  date: string
  count: number
}

export interface EventCount {
  eventName: string
  count: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class EventsRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewAnalyticsEvent, "id" | "createdAt" | "tenantId">): Promise<AnalyticsEvent> {
    const [result] = await this.db
      .insert(analyticsEvents)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<AnalyticsEvent | null> {
    const [result] = await this.db
      .select()
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.id, id), eq(analyticsEvents.tenantId, this.tenantId)))
      .limit(1)

    return result ?? null
  }

  async countByDateRange(
    options: EventQueryOptions,
    groupBy: "hour" | "day" | "week" | "month" = "day"
  ): Promise<DateCount[]> {
    let dateFormat: string
    switch (groupBy) {
      case "hour":
        dateFormat = "YYYY-MM-DD HH24:00:00"
        break
      case "week":
        dateFormat = "IYYY-IW"
        break
      case "month":
        dateFormat = "YYYY-MM"
        break
      default:
        dateFormat = "YYYY-MM-DD"
    }

    const conditions = [
      eq(analyticsEvents.tenantId, this.tenantId),
      gte(analyticsEvents.timestamp, options.startDate),
      lte(analyticsEvents.timestamp, options.endDate),
    ]

    if (options.eventName) {
      conditions.push(eq(analyticsEvents.eventName, options.eventName))
    }

    const results = await this.db
      .select({
        date: sql<string>`to_char(${analyticsEvents.timestamp}, ${dateFormat})`,
        count: count(),
      })
      .from(analyticsEvents)
      .where(and(...conditions))
      .groupBy(sql`to_char(${analyticsEvents.timestamp}, ${dateFormat})`)
      .orderBy(sql`to_char(${analyticsEvents.timestamp}, ${dateFormat})`)

    return results
  }

  async getTopEvents(options: EventQueryOptions): Promise<EventCount[]> {
    const limit = options.limit ?? 10

    return this.db
      .select({
        eventName: analyticsEvents.eventName,
        count: count(),
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.tenantId, this.tenantId),
          gte(analyticsEvents.timestamp, options.startDate),
          lte(analyticsEvents.timestamp, options.endDate)
        )
      )
      .groupBy(analyticsEvents.eventName)
      .orderBy(desc(count()))
      .limit(limit)
  }

  async countUniqueUsers(options: EventQueryOptions): Promise<number> {
    const [result] = await this.db
      .select({
        count: sql<number>`count(distinct ${analyticsEvents.userId})`,
      })
      .from(analyticsEvents)
      .where(
        and(
          eq(analyticsEvents.tenantId, this.tenantId),
          gte(analyticsEvents.timestamp, options.startDate),
          lte(analyticsEvents.timestamp, options.endDate),
          sql`${analyticsEvents.userId} is not null`
        )
      )

    return result?.count ?? 0
  }

  async incrementSessionEventCount(sessionId: string): Promise<void> {
    const { analyticsSessions } = await import("../schema.js")

    await this.db
      .update(analyticsSessions)
      .set({
        eventCount: sql`${analyticsSessions.eventCount} + 1`,
      })
      .where(eq(analyticsSessions.sessionId, sessionId))
  }
}
