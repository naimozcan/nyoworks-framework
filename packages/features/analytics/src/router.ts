// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm"
import { v4 as uuidv4 } from "uuid"
import {
  trackEventInput,
  trackPageviewInput,
  analyticsQueryInput,
  createSessionInput,
  updateSessionInput,
} from "./validators.js"
import { analyticsEvents, analyticsPageviews, analyticsSessions } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyticsContext {
  user?: { id: string }
  tenantId?: string
  requestInfo?: {
    userAgent?: string
    ipAddress?: string
  }
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
  }
}

const t = initTRPC.context<AnalyticsContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Tracking Router (Public - no auth required)
// ─────────────────────────────────────────────────────────────────────────────

const trackRouter = t.router({
  event: t.procedure
    .input(trackEventInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
      }

      const db = ctx.db as never

      const [event] = await db
        .insert(analyticsEvents)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.user?.id,
          sessionId: input.sessionId,
          eventName: input.eventName,
          eventType: "track",
          properties: input.properties,
          userAgent: ctx.requestInfo?.userAgent,
          ipAddress: ctx.requestInfo?.ipAddress,
          timestamp: input.timestamp || new Date(),
        })
        .returning()

      if (input.sessionId) {
        await db
          .update(analyticsSessions)
          .set({
            eventCount: sql`${analyticsSessions.eventCount} + 1`,
          })
          .where(eq(analyticsSessions.sessionId, input.sessionId))
      }

      return { id: event.id, eventName: event.eventName, timestamp: event.timestamp }
    }),

  pageview: t.procedure
    .input(trackPageviewInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
      }

      const db = ctx.db as never

      const [pageview] = await db
        .insert(analyticsPageviews)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.user?.id,
          sessionId: input.sessionId,
          pathname: input.pathname,
          title: input.title,
          referrer: input.referrer,
          userAgent: ctx.requestInfo?.userAgent,
          ipAddress: ctx.requestInfo?.ipAddress,
          duration: input.duration,
        })
        .returning()

      if (input.sessionId) {
        await db
          .update(analyticsSessions)
          .set({
            pageviewCount: sql`${analyticsSessions.pageviewCount} + 1`,
            exitPage: input.pathname,
          })
          .where(eq(analyticsSessions.sessionId, input.sessionId))
      }

      return { id: pageview.id, pathname: pageview.pathname, timestamp: pageview.timestamp }
    }),

  identify: t.procedure
    .input(trackEventInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId || !ctx.user?.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID and User ID required" })
      }

      const db = ctx.db as never

      const [event] = await db
        .insert(analyticsEvents)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          sessionId: input.sessionId,
          eventName: "identify",
          eventType: "identify",
          properties: input.properties,
          userAgent: ctx.requestInfo?.userAgent,
          ipAddress: ctx.requestInfo?.ipAddress,
        })
        .returning()

      return { id: event.id }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Session Router
// ─────────────────────────────────────────────────────────────────────────────

const sessionRouter = t.router({
  create: t.procedure
    .input(createSessionInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
      }

      const db = ctx.db as never
      const sessionId = uuidv4()

      const [session] = await db
        .insert(analyticsSessions)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.user?.id,
          sessionId,
          userAgent: input.userAgent || ctx.requestInfo?.userAgent,
          ipAddress: ctx.requestInfo?.ipAddress,
          referrer: input.referrer,
          entryPage: input.entryPage,
        })
        .returning()

      return {
        id: session.id,
        sessionId: session.sessionId,
        startedAt: session.startedAt,
      }
    }),

  update: t.procedure
    .input(updateSessionInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [session] = await db
        .update(analyticsSessions)
        .set({
          exitPage: input.exitPage,
          endedAt: input.endedAt || new Date(),
        })
        .where(eq(analyticsSessions.sessionId, input.sessionId))
        .returning()

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" })
      }

      return session
    }),

  get: t.procedure
    .input(updateSessionInput.pick({ sessionId: true }))
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [session] = await db
        .select()
        .from(analyticsSessions)
        .where(eq(analyticsSessions.sessionId, input.sessionId))
        .limit(1)

      return session || null
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Query Router (Protected - auth required)
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({ ctx: { ...ctx, user: ctx.user } })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

const queryRouter = t.router({
  eventCounts: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { startDate, endDate, eventName, groupBy } = input

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

      let query = db
        .select({
          date: sql<string>`to_char(${analyticsEvents.timestamp}, ${dateFormat})`,
          count: count(),
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.tenantId, ctx.tenantId),
            gte(analyticsEvents.timestamp, startDate),
            lte(analyticsEvents.timestamp, endDate)
          )
        )
        .groupBy(sql`to_char(${analyticsEvents.timestamp}, ${dateFormat})`)
        .orderBy(sql`to_char(${analyticsEvents.timestamp}, ${dateFormat})`)

      if (eventName) {
        query = query.where(eq(analyticsEvents.eventName, eventName))
      }

      return query
    }),

  topEvents: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { startDate, endDate, limit } = input

      return db
        .select({
          eventName: analyticsEvents.eventName,
          count: count(),
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.tenantId, ctx.tenantId),
            gte(analyticsEvents.timestamp, startDate),
            lte(analyticsEvents.timestamp, endDate)
          )
        )
        .groupBy(analyticsEvents.eventName)
        .orderBy(desc(count()))
        .limit(limit)
    }),

  topPages: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { startDate, endDate, limit } = input

      return db
        .select({
          pathname: analyticsPageviews.pathname,
          count: count(),
        })
        .from(analyticsPageviews)
        .where(
          and(
            eq(analyticsPageviews.tenantId, ctx.tenantId),
            gte(analyticsPageviews.timestamp, startDate),
            lte(analyticsPageviews.timestamp, endDate)
          )
        )
        .groupBy(analyticsPageviews.pathname)
        .orderBy(desc(count()))
        .limit(limit)
    }),

  pageviewCounts: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { startDate, endDate, groupBy } = input

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

      return db
        .select({
          date: sql<string>`to_char(${analyticsPageviews.timestamp}, ${dateFormat})`,
          count: count(),
        })
        .from(analyticsPageviews)
        .where(
          and(
            eq(analyticsPageviews.tenantId, ctx.tenantId),
            gte(analyticsPageviews.timestamp, startDate),
            lte(analyticsPageviews.timestamp, endDate)
          )
        )
        .groupBy(sql`to_char(${analyticsPageviews.timestamp}, ${dateFormat})`)
        .orderBy(sql`to_char(${analyticsPageviews.timestamp}, ${dateFormat})`)
    }),

  sessionStats: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { startDate, endDate } = input

      const stats = await db
        .select({
          totalSessions: count(),
          avgPageviews: sql<number>`avg(${analyticsSessions.pageviewCount})`,
          avgEvents: sql<number>`avg(${analyticsSessions.eventCount})`,
        })
        .from(analyticsSessions)
        .where(
          and(
            eq(analyticsSessions.tenantId, ctx.tenantId),
            gte(analyticsSessions.startedAt, startDate),
            lte(analyticsSessions.startedAt, endDate)
          )
        )

      return stats[0] || { totalSessions: 0, avgPageviews: 0, avgEvents: 0 }
    }),

  uniqueUsers: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { startDate, endDate } = input

      const result = await db
        .select({
          count: sql<number>`count(distinct ${analyticsEvents.userId})`,
        })
        .from(analyticsEvents)
        .where(
          and(
            eq(analyticsEvents.tenantId, ctx.tenantId),
            gte(analyticsEvents.timestamp, startDate),
            lte(analyticsEvents.timestamp, endDate),
            sql`${analyticsEvents.userId} is not null`
          )
        )

      return { count: result[0]?.count || 0 }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsRouter = t.router({
  track: trackRouter,
  session: sessionRouter,
  query: queryRouter,
})

export type AnalyticsRouter = typeof analyticsRouter
