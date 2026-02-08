// ═══════════════════════════════════════════════════════════════════════════════
// Audit Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
import {
  createAuditLogInput,
  listAuditLogsInput,
  getAuditLogInput,
  getEntityHistoryInput,
  getUserActivityInput,
} from "./validators.js"
import { AuditService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const auditRouter = router({
  log: tenantProcedure
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

  list: tenantProcedure
    .input(listAuditLogsInput)
    .query(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.list(input)
    }),

  get: tenantProcedure
    .input(getAuditLogInput)
    .query(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.get(input.auditLogId)
    }),

  getEntityHistory: tenantProcedure
    .input(getEntityHistoryInput)
    .query(async ({ input, ctx }) => {
      const service = new AuditService(ctx.db, ctx.tenantId)
      return service.getEntityHistory(input.entityType, input.entityId, {
        limit: input.limit,
        offset: input.offset,
      })
    }),

  getUserActivity: tenantProcedure
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

  getStats: tenantProcedure.query(async ({ ctx }) => {
    const service = new AuditService(ctx.db, ctx.tenantId)
    return service.getStats()
  }),
})

export type AuditRouter = typeof auditRouter
