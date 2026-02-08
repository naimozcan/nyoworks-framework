// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Sessions Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, gte, lte, sql, count } from "drizzle-orm"
import { analyticsSessions, type AnalyticsSession, type NewAnalyticsSession } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SessionQueryOptions {
  startDate: Date
  endDate: Date
}

export interface SessionStats {
  totalSessions: number
  avgPageviews: number
  avgEvents: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class SessionsRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewAnalyticsSession, "id" | "tenantId">): Promise<AnalyticsSession> {
    const [result] = await this.db
      .insert(analyticsSessions)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<AnalyticsSession | null> {
    const [result] = await this.db
      .select()
      .from(analyticsSessions)
      .where(and(eq(analyticsSessions.id, id), eq(analyticsSessions.tenantId, this.tenantId)))
      .limit(1)

    return result ?? null
  }

  async findBySessionId(sessionId: string): Promise<AnalyticsSession | null> {
    const [result] = await this.db
      .select()
      .from(analyticsSessions)
      .where(eq(analyticsSessions.sessionId, sessionId))
      .limit(1)

    return result ?? null
  }

  async update(
    sessionId: string,
    data: Partial<Pick<AnalyticsSession, "exitPage" | "endedAt">>
  ): Promise<AnalyticsSession | null> {
    const [result] = await this.db
      .update(analyticsSessions)
      .set(data)
      .where(eq(analyticsSessions.sessionId, sessionId))
      .returning()

    return result ?? null
  }

  async getStats(options: SessionQueryOptions): Promise<SessionStats> {
    const [stats] = await this.db
      .select({
        totalSessions: count(),
        avgPageviews: sql<number>`coalesce(avg(${analyticsSessions.pageviewCount}), 0)`,
        avgEvents: sql<number>`coalesce(avg(${analyticsSessions.eventCount}), 0)`,
      })
      .from(analyticsSessions)
      .where(
        and(
          eq(analyticsSessions.tenantId, this.tenantId),
          gte(analyticsSessions.startedAt, options.startDate),
          lte(analyticsSessions.startedAt, options.endDate)
        )
      )

    return stats || { totalSessions: 0, avgPageviews: 0, avgEvents: 0 }
  }

  async countByDateRange(
    options: SessionQueryOptions,
    groupBy: "hour" | "day" | "week" | "month" = "day"
  ): Promise<{ date: string; count: number }[]> {
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

    return this.db
      .select({
        date: sql<string>`to_char(${analyticsSessions.startedAt}, ${dateFormat})`,
        count: count(),
      })
      .from(analyticsSessions)
      .where(
        and(
          eq(analyticsSessions.tenantId, this.tenantId),
          gte(analyticsSessions.startedAt, options.startDate),
          lte(analyticsSessions.startedAt, options.endDate)
        )
      )
      .groupBy(sql`to_char(${analyticsSessions.startedAt}, ${dateFormat})`)
      .orderBy(sql`to_char(${analyticsSessions.startedAt}, ${dateFormat})`)
  }
}
