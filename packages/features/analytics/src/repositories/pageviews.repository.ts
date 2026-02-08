// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Pageviews Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm"
import { analyticsPageviews, analyticsSessions, type AnalyticsPageview, type NewAnalyticsPageview } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PageviewQueryOptions {
  startDate: Date
  endDate: Date
  limit?: number
}

export interface DateCount {
  date: string
  count: number
}

export interface PageCount {
  pathname: string
  count: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class PageviewsRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewAnalyticsPageview, "id" | "tenantId">): Promise<AnalyticsPageview> {
    const [result] = await this.db
      .insert(analyticsPageviews)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<AnalyticsPageview | null> {
    const [result] = await this.db
      .select()
      .from(analyticsPageviews)
      .where(and(eq(analyticsPageviews.id, id), eq(analyticsPageviews.tenantId, this.tenantId)))
      .limit(1)

    return result ?? null
  }

  async countByDateRange(
    options: PageviewQueryOptions,
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

    return this.db
      .select({
        date: sql<string>`to_char(${analyticsPageviews.timestamp}, ${dateFormat})`,
        count: count(),
      })
      .from(analyticsPageviews)
      .where(
        and(
          eq(analyticsPageviews.tenantId, this.tenantId),
          gte(analyticsPageviews.timestamp, options.startDate),
          lte(analyticsPageviews.timestamp, options.endDate)
        )
      )
      .groupBy(sql`to_char(${analyticsPageviews.timestamp}, ${dateFormat})`)
      .orderBy(sql`to_char(${analyticsPageviews.timestamp}, ${dateFormat})`)
  }

  async getTopPages(options: PageviewQueryOptions): Promise<PageCount[]> {
    const limit = options.limit ?? 10

    return this.db
      .select({
        pathname: analyticsPageviews.pathname,
        count: count(),
      })
      .from(analyticsPageviews)
      .where(
        and(
          eq(analyticsPageviews.tenantId, this.tenantId),
          gte(analyticsPageviews.timestamp, options.startDate),
          lte(analyticsPageviews.timestamp, options.endDate)
        )
      )
      .groupBy(analyticsPageviews.pathname)
      .orderBy(desc(count()))
      .limit(limit)
  }

  async incrementSessionPageviewCount(sessionId: string, exitPage: string): Promise<void> {
    await this.db
      .update(analyticsSessions)
      .set({
        pageviewCount: sql`${analyticsSessions.pageviewCount} + 1`,
        exitPage,
      })
      .where(eq(analyticsSessions.sessionId, sessionId))
  }
}
