// ═══════════════════════════════════════════════════════════════════════════════
// Export Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
import {
  createExportJobInput,
  getExportJobInput,
  listExportJobsInput,
} from "./validators.js"
import { ExportService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const exportRouter = router({
  create: tenantProcedure
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

  get: tenantProcedure
    .input(getExportJobInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      return service.get(input.jobId)
    }),

  list: tenantProcedure
    .input(listExportJobsInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      return service.list(input)
    }),

  download: tenantProcedure
    .input(getExportJobInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      const url = await service.getDownloadUrl(input.jobId)
      return { url }
    }),

  cancel: tenantProcedure
    .input(getExportJobInput)
    .mutation(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      const success = await service.cancel(input.jobId)
      return { success }
    }),

  myJobs: tenantProcedure
    .input(listExportJobsInput)
    .query(async ({ input, ctx }) => {
      const service = new ExportService(ctx.db, ctx.tenantId)
      return service.getUserJobs(ctx.user.id, {
        limit: input.limit,
        offset: input.offset,
      })
    }),

  stats: tenantProcedure.query(async ({ ctx }) => {
    const service = new ExportService(ctx.db, ctx.tenantId)
    return service.getStats()
  }),
})

export type ExportRouter = typeof exportRouter
