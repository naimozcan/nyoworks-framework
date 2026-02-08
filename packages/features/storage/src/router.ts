// ═══════════════════════════════════════════════════════════════════════════════
// Storage Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
import {
  uploadFileInput,
  getPresignedUrlInput,
  deleteFileInput,
  listFilesInput,
  confirmUploadInput,
} from "./validators.js"
import { StorageService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const storageRouter = router({
  requestUpload: tenantProcedure
    .input(uploadFileInput)
    .mutation(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.requestUpload({
        userId: ctx.user.id,
        filename: input.filename,
        mimeType: input.mimeType,
        size: input.size,
        isPublic: input.isPublic,
        metadata: input.metadata,
        folder: input.folder,
      })
    }),

  confirmUpload: tenantProcedure
    .input(confirmUploadInput)
    .mutation(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.confirmUpload(input.fileId, ctx.user.id)
    }),

  getPresignedUrl: tenantProcedure
    .input(getPresignedUrlInput)
    .query(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.getPresignedUrl(input.fileId, input.expiresIn)
    }),

  deleteFile: tenantProcedure
    .input(deleteFileInput)
    .mutation(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.deleteFile(input.fileId, ctx.user.id)
    }),

  listFiles: tenantProcedure
    .input(listFilesInput)
    .query(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.listFiles({
        folder: input.folder,
        mimeType: input.mimeType,
        isPublic: input.isPublic,
        limit: input.limit,
        offset: input.offset,
        sortBy: input.sortBy,
        sortOrder: input.sortOrder,
      })
    }),

  getFile: tenantProcedure
    .input(deleteFileInput)
    .query(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.getFile(input.fileId)
    }),
})

export type StorageRouter = typeof storageRouter
