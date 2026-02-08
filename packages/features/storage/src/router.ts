// ═══════════════════════════════════════════════════════════════════════════════
// Storage Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  uploadFileInput,
  getPresignedUrlInput,
  deleteFileInput,
  listFilesInput,
  confirmUploadInput,
} from "./validators.js"
import { StorageService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface StorageContext {
  user?: { id: string }
  tenantId?: string
  db: unknown
}

const t = initTRPC.context<StorageContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.tenantId) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
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

export const storageRouter = t.router({
  requestUpload: protectedProcedure
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

  confirmUpload: protectedProcedure
    .input(confirmUploadInput)
    .mutation(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.confirmUpload(input.fileId, ctx.user.id)
    }),

  getPresignedUrl: protectedProcedure
    .input(getPresignedUrlInput)
    .query(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.getPresignedUrl(input.fileId, input.expiresIn)
    }),

  deleteFile: protectedProcedure
    .input(deleteFileInput)
    .mutation(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.deleteFile(input.fileId, ctx.user.id)
    }),

  listFiles: protectedProcedure
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

  getFile: protectedProcedure
    .input(deleteFileInput)
    .query(async ({ input, ctx }) => {
      const service = new StorageService(ctx.db, ctx.tenantId)
      return service.getFile(input.fileId)
    }),
})

export type StorageRouter = typeof storageRouter
