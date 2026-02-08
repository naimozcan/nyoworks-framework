// ═══════════════════════════════════════════════════════════════════════════════
// Audit Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm"
import {
  createAuditLogInput,
  listAuditLogsInput,
  getAuditLogInput,
  getEntityHistoryInput,
  getUserActivityInput,
} from "./validators.js"
import { auditLogs } from "./schema.js"

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
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
  }
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any

      const [auditLog] = await db
        .insert(auditLogs)
        .values({
          tenantId: ctx.tenantId,
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
        .returning()

      return auditLog
    }),

  list: protectedProcedure
    .input(listAuditLogsInput)
    .query(async ({ input, ctx }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any
      const {
        limit,
        offset,
        userId,
        action,
        entityType,
        entityId,
        startDate,
        endDate,
        sortBy,
        sortOrder,
      } = input

      let query = db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, ctx.tenantId))

      if (userId) {
        query = query.where(eq(auditLogs.userId, userId))
      }

      if (action) {
        query = query.where(eq(auditLogs.action, action))
      }

      if (entityType) {
        query = query.where(eq(auditLogs.entityType, entityType))
      }

      if (entityId) {
        query = query.where(eq(auditLogs.entityId, entityId))
      }

      if (startDate) {
        query = query.where(gte(auditLogs.createdAt, new Date(startDate)))
      }

      if (endDate) {
        query = query.where(lte(auditLogs.createdAt, new Date(endDate)))
      }

      const orderFn = sortOrder === "asc" ? asc : desc
      const orderColumn = sortBy === "createdAt" ? auditLogs.createdAt
        : sortBy === "action" ? auditLogs.action
        : auditLogs.entityType
      query = query.orderBy(orderFn(orderColumn))

      const items = await query.limit(limit).offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(eq(auditLogs.tenantId, ctx.tenantId))

      return {
        items,
        total: countResult[0]?.count || 0,
        hasMore: offset + limit < (countResult[0]?.count || 0),
      }
    }),

  get: protectedProcedure
    .input(getAuditLogInput)
    .query(async ({ input, ctx }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any

      const result = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.id, input.auditLogId),
            eq(auditLogs.tenantId, ctx.tenantId)
          )
        )
        .limit(1)

      if (!result[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Audit log not found" })
      }

      return result[0]
    }),

  getEntityHistory: protectedProcedure
    .input(getEntityHistoryInput)
    .query(async ({ input, ctx }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any
      const { entityType, entityId, limit, offset } = input

      const items = await db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, ctx.tenantId),
            eq(auditLogs.entityType, entityType),
            eq(auditLogs.entityId, entityId)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  getUserActivity: protectedProcedure
    .input(getUserActivityInput)
    .query(async ({ input, ctx }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = ctx.db as any
      const { userId, limit, offset, startDate, endDate } = input

      let query = db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.tenantId, ctx.tenantId),
            eq(auditLogs.userId, userId)
          )
        )

      if (startDate) {
        query = query.where(gte(auditLogs.createdAt, new Date(startDate)))
      }

      if (endDate) {
        query = query.where(lte(auditLogs.createdAt, new Date(endDate)))
      }

      const items = await query
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = ctx.db as any

    const totalLogs = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.tenantId))

    const actionCounts = await db
      .select({
        action: auditLogs.action,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.tenantId))
      .groupBy(auditLogs.action)

    const entityTypeCounts = await db
      .select({
        entityType: auditLogs.entityType,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, ctx.tenantId))
      .groupBy(auditLogs.entityType)

    return {
      total: totalLogs[0]?.count || 0,
      byAction: Object.fromEntries(
        actionCounts.map((row: { action: string; count: number }) => [row.action, row.count])
      ),
      byEntityType: Object.fromEntries(
        entityTypeCounts.map((row: { entityType: string; count: number }) => [row.entityType, row.count])
      ),
    }
  }),
})

export type AuditRouter = typeof auditRouter
