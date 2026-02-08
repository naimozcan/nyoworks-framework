// ═══════════════════════════════════════════════════════════════════════════════
// Export Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  createExportJobInput,
  getExportJobInput,
  listExportJobsInput,
} from "./validators.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface ExportContext {
  user?: { id: string }
  tenantId?: string
  db?: unknown
}

const t = initTRPC.context<ExportContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
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
      const jobId = crypto.randomUUID()
      const now = new Date()

      return {
        id: jobId,
        type: input.type,
        status: "pending" as const,
        format: input.format,
        filters: input.filters || null,
        fileUrl: null,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
        createdAt: now,
      }
    }),

  get: protectedProcedure
    .input(getExportJobInput)
    .query(async ({ input, ctx }) => {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Export job not found",
      })
    }),

  list: protectedProcedure
    .input(listExportJobsInput)
    .query(async ({ input, ctx }) => {
      return {
        jobs: [],
        total: 0,
        hasMore: false,
      }
    }),

  download: protectedProcedure
    .input(getExportJobInput)
    .query(async ({ input, ctx }) => {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Export job not found or not completed",
      })
    }),

  cancel: protectedProcedure
    .input(getExportJobInput)
    .mutation(async ({ input, ctx }) => {
      return { success: true }
    }),
})

export type ExportRouter = typeof exportRouter
