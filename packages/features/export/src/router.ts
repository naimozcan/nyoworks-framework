// ═══════════════════════════════════════════════════════════════════════════════
// Export Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  createExportJobInput,
  getExportJobInput,
  listExportJobsInput,
} from "./validators.js"
import { ExportService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface ExportContext {
  user?: { id: string }
  tenantId?: string
  db: unknown
}

const t = initTRPC.context<ExportContext>().create()

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

export const exportRouter = t.router({
  create: protectedProcedure
    .input(createExportJobInput)
    .mutation(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      return service.create({
        userId: ctx.user.id,
        type: input.type,
        format: input.format,
        filters: input.filters,
      })
    }),

  get: protectedProcedure
    .input(getExportJobInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      return service.get(input.jobId)
    }),

  list: protectedProcedure
    .input(listExportJobsInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      return service.list(input)
    }),

  download: protectedProcedure
    .input(getExportJobInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      const url = await service.getDownloadUrl(input.jobId)
      return { url }
    }),

  cancel: protectedProcedure
    .input(getExportJobInput)
    .mutation(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      const success = await service.cancel(input.jobId)
      return { success }
    }),

  myJobs: protectedProcedure
    .input(listExportJobsInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      return service.getUserJobs(ctx.user.id, {
        limit: input.limit,
        offset: input.offset,
      })
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const service = new ExportService(ctx.db, ctx.tenantId)
    return service.getStats()
  }),
})

export type ExportRouter = typeof exportRouter
