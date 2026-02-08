// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { TRPCError } from "@trpc/server"
import { router, publicProcedure, publicTenantProcedure, tenantProcedure } from "@nyoworks/api"
import {
  trackEventInput,
  trackPageviewInput,
  analyticsQueryInput,
  createSessionInput,
  updateSessionInput,
} from "./validators.js"
import { AnalyticsService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Tracking Router (Public - no auth required)
// ─────────────────────────────────────────────────────────────────────────────

const trackRouter = router({
  event: publicTenantProcedure
    .input(trackEventInput)
    .mutation(async ({ input, ctx }) => {
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

  pageview: publicTenantProcedure
    .input(trackPageviewInput)
    .mutation(async ({ input, ctx }) => {
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

  identify: publicProcedure
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

const sessionRouter = router({
  create: publicTenantProcedure
    .input(createSessionInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.createSession({
        userId: ctx.user?.id,
        userAgent: input.userAgent || ctx.requestInfo?.userAgent,
        ipAddress: ctx.requestInfo?.ipAddress,
        referrer: input.referrer,
        entryPage: input.entryPage,
      })
    }),

  update: publicTenantProcedure
    .input(updateSessionInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.updateSession({
        sessionId: input.sessionId,
        exitPage: input.exitPage,
        endedAt: input.endedAt,
      })
    }),

  get: publicTenantProcedure
    .input(updateSessionInput.pick({ sessionId: true }))
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getSession(input.sessionId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Query Router (Protected - auth required)
// ─────────────────────────────────────────────────────────────────────────────

const queryRouter = router({
  eventCounts: tenantProcedure
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

  topEvents: tenantProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getTopEvents({
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
      })
    }),

  topPages: tenantProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getTopPages({
        startDate: input.startDate,
        endDate: input.endDate,
        limit: input.limit,
      })
    }),

  pageviewCounts: tenantProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getPageviewCounts({
        startDate: input.startDate,
        endDate: input.endDate,
        groupBy: input.groupBy,
      })
    }),

  sessionStats: tenantProcedure
    .input(analyticsQueryInput)
    .query(async ({ input, ctx }) => {
      const service = new AnalyticsService(ctx.db, ctx.tenantId)
      return service.getSessionStats({
        startDate: input.startDate,
        endDate: input.endDate,
      })
    }),

  uniqueUsers: tenantProcedure
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

export const analyticsRouter = router({
  track: trackRouter,
  session: sessionRouter,
  query: queryRouter,
})

export type AnalyticsRouter = typeof analyticsRouter
