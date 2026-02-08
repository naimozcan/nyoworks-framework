// ═══════════════════════════════════════════════════════════════════════════════
// Audit Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  createAuditLogInput,
  listAuditLogsInput,
  getAuditLogInput,
  getEntityHistoryInput,
  getUserActivityInput,
} from "./validators.js"
import { AuditService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface AuditContext {
  user?: { id: string; email: string }
  tenantId?: string
  requestInfo?: {
    ipAddress?: string
    userAgent?: string
  }
  db: unknown
}

const t = initTRPC.context<AuditContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
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

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const auditRouter = t.router({
  log: protectedProcedure
    .input(createAuditLogInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.log({
        userId: ctx.user.id,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: input.oldValue,
        newValue: input.newValue,
        ipAddress: input.ipAddress || ctx.requestInfo?.ipAddress,
        userAgent: input.userAgent || ctx.requestInfo?.userAgent,
        metadata: input.metadata,
      })
    }),

  list: protectedProcedure
    .input(listAuditLogsInput)
    .query(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.list(input)
    }),

  get: protectedProcedure
    .input(getAuditLogInput)
    .query(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.get(input.auditLogId)
    }),

  getEntityHistory: protectedProcedure
    .input(getEntityHistoryInput)
    .query(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.getEntityHistory(input.entityType, input.entityId, {
        limit: input.limit,
        offset: input.offset,
      })
    }),

  getUserActivity: protectedProcedure
    .input(getUserActivityInput)
    .query(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.getUserActivity(input.userId, {
        limit: input.limit,
        offset: input.offset,
        startDate: input.startDate,
        endDate: input.endDate,
      })
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const service = new AuditService(ctx.db, ctx.tenantId)
    return service.getStats()
  }),
})

export type AuditRouter = typeof auditRouter
