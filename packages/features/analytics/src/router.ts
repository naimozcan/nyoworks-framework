// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  trackEventInput,
  trackPageviewInput,
  analyticsQueryInput,
  createSessionInput,
  updateSessionInput,
} from "./validators.js"
import { AnalyticsService } from "./services/index.js"

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
  db: unknown
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

      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.trackEvent({
        userId: ctx.user?.id,
        sessionId: input.sessionId,
        eventName: input.eventName,
        eventType: "track",
        properties: input.properties,
        userAgent: ctx.requestInfo?.userAgent,
        ipAddress: ctx.requestInfo?.ipAddress,
        timestamp: input.timestamp,
      })
    }),

  pageview: t.procedure
    .input(trackPageviewInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
      }

      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.trackPageview({
        userId: ctx.user?.id,
        sessionId: input.sessionId,
        pathname: input.pathname,
        title: input.title,
        referrer: input.referrer,
        userAgent: ctx.requestInfo?.userAgent,
        ipAddress: ctx.requestInfo?.ipAddress,
        duration: input.duration,
      })
    }),

  identify: t.procedure
    .input(trackEventInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId || !ctx.user?.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID and User ID required" })
      }

      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.identify({
        userId: ctx.user.id,
        sessionId: input.sessionId,
        eventName: input.eventName,
        properties: input.properties,
        userAgent: ctx.requestInfo?.userAgent,
        ipAddress: ctx.requestInfo?.ipAddress,
      })
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

      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.createSession({
        userId: ctx.user?.id,
        userAgent: input.userAgent || ctx.requestInfo?.userAgent,
        ipAddress: ctx.requestInfo?.ipAddress,
        referrer: input.referrer,
        entryPage: input.entryPage,
      })
    }),

  update: t.procedure
    .input(updateSessionInput)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
      }

      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.updateSession({
        sessionId: input.sessionId,
        exitPage: input.exitPage,
        endedAt: input.endedAt,
      })
    }),

  get: t.procedure
    .input(updateSessionInput.pick({ sessionId: true }))
    .query(async ({ input, ctx }) => {
      if (!ctx.tenantId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
      }

      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getSession(input.sessionId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Query Router (Protected - auth required)
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

const queryRouter = t.router({
  eventCounts: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getEventCounts({
        startDate: input.startDate,
        endDate: input.endDate,
        eventName: input.eventName,
        groupBy: input.groupBy,
      })
    }),

  topEvents: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getTopEvents({
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
      })
    }),

  topPages: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getTopPages({
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
      })
    }),

  pageviewCounts: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getPageviewCounts({
        startDate: input.startDate,
        endDate: input.endDate,
        groupBy: input.groupBy,
      })
    }),

  sessionStats: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getSessionStats({
        startDate: input.startDate,
        endDate: input.endDate,
      })
    }),

  uniqueUsers: protectedProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getUniqueUsers({
        startDate: input.startDate,
        endDate: input.endDate,
      })
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
