// ═══════════════════════════════════════════════════════════════════════════════
// Storage Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, like, desc, asc } from "drizzle-orm"
import { files } from "./schema.js"
import {
  uploadFileInput,
  getPresignedUrlInput,
  deleteFileInput,
  listFilesInput,
  confirmUploadInput,
} from "./validators.js"
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  deleteObject,
  headObject,
  buildPublicUrl,
  generateKey,
  getBucket,
} from "./s3.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface StorageContext {
  user?: { id: string }
  tenantId?: string
  db: {
    insert: (table: typeof files) => {
      values: (data: typeof files.$inferInsert) => {
        returning: () => Promise<(typeof files.$inferSelect)[]>
      }
    }
    select: () => {
      from: (table: typeof files) => {
        where: (condition: unknown) => {
          orderBy: (order: unknown) => {
            limit: (n: number) => {
              offset: (n: number) => Promise<(typeof files.$inferSelect)[]>
            }
          }
        }
      }
    }
    update: (table: typeof files) => {
      set: (data: Partial<typeof files.$inferInsert>) => {
        where: (condition: unknown) => {
          returning: () => Promise<(typeof files.$inferSelect)[]>
        }
      }
    }
    delete: (table: typeof files) => {
      where: (condition: unknown) => Promise<void>
    }
  }
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
      const key = generateKey(ctx.tenantId, ctx.user.id, input.filename, input.folder)
      const bucket = getBucket()
      const url = buildPublicUrl(key)
      const expiresIn = 3600

      const presignedUrl = await createPresignedUploadUrl(key, input.mimeType, expiresIn)

      const [file] = await ctx.db
        .insert(files)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          key,
          filename: input.filename,
          mimeType: input.mimeType,
          size: input.size,
          bucket,
          url,
          isPublic: input.isPublic,
          metadata: input.metadata,
        })
        .returning()

      return {
        fileId: file!.id,
        presignedUrl,
        key,
        expiresIn,
      }
    }),

  confirmUpload: protectedProcedure
    .input(confirmUploadInput)
    .mutation(async ({ input, ctx }) => {
      const [file] = await ctx.db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, input.fileId),
            eq(files.tenantId, ctx.tenantId),
            eq(files.userId, ctx.user.id)
          )
        )
        .orderBy(desc(files.createdAt))
        .limit(1)
        .offset(0)

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
      }

      const objectInfo = await headObject(file.key)
      if (!objectInfo) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "File not uploaded to storage" })
      }

      return {
        file: {
          id: file.id,
          key: file.key,
          filename: file.filename,
          mimeType: file.mimeType,
          size: objectInfo.contentLength,
          url: file.url,
          thumbnailUrl: file.thumbnailUrl,
          isPublic: file.isPublic,
          metadata: file.metadata,
          createdAt: file.createdAt,
        },
      }
    }),

  getPresignedUrl: protectedProcedure
    .input(getPresignedUrlInput)
    .query(async ({ input, ctx }) => {
      const [file] = await ctx.db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, input.fileId),
            eq(files.tenantId, ctx.tenantId)
          )
        )
        .orderBy(desc(files.createdAt))
        .limit(1)
        .offset(0)

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
      }

      if (file.isPublic) {
        return {
          url: file.url,
          expiresIn: 0,
        }
      }

      const url = await createPresignedDownloadUrl(file.key, input.expiresIn)
      return {
        url,
        expiresIn: input.expiresIn,
      }
    }),

  deleteFile: protectedProcedure
    .input(deleteFileInput)
    .mutation(async ({ input, ctx }) => {
      const [file] = await ctx.db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, input.fileId),
            eq(files.tenantId, ctx.tenantId),
            eq(files.userId, ctx.user.id)
          )
        )
        .orderBy(desc(files.createdAt))
        .limit(1)
        .offset(0)

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
      }

      await deleteObject(file.key)
      await ctx.db.delete(files).where(eq(files.id, input.fileId))

      return { success: true }
    }),

  listFiles: protectedProcedure
    .input(listFilesInput)
    .query(async ({ input, ctx }) => {
      const conditions = [eq(files.tenantId, ctx.tenantId)]

      if (input.folder) {
        conditions.push(like(files.key, `%/${input.folder}/%`))
      }
      if (input.mimeType) {
        conditions.push(like(files.mimeType, `${input.mimeType}%`))
      }
      if (typeof input.isPublic === "boolean") {
        conditions.push(eq(files.isPublic, input.isPublic))
      }

      const orderColumn = input.sortBy === "filename"
        ? files.filename
        : input.sortBy === "size"
          ? files.size
          : files.createdAt

      const orderFn = input.sortOrder === "asc" ? asc : desc

      const results = await ctx.db
        .select()
        .from(files)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn))
        .limit(input.limit + 1)
        .offset(input.offset)

      const hasMore = results.length > input.limit
      const fileList = hasMore ? results.slice(0, input.limit) : results

      return {
        files: fileList.map((f) => ({
          id: f.id,
          key: f.key,
          filename: f.filename,
          mimeType: f.mimeType,
          size: f.size,
          url: f.url,
          thumbnailUrl: f.thumbnailUrl,
          isPublic: f.isPublic,
          metadata: f.metadata,
          createdAt: f.createdAt,
        })),
        total: fileList.length,
        hasMore,
      }
    }),

  getFile: protectedProcedure
    .input(deleteFileInput)
    .query(async ({ input, ctx }) => {
      const [file] = await ctx.db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, input.fileId),
            eq(files.tenantId, ctx.tenantId)
          )
        )
        .orderBy(desc(files.createdAt))
        .limit(1)
        .offset(0)

      if (!file) {
        throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
      }

      return {
        id: file.id,
        key: file.key,
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url,
        thumbnailUrl: file.thumbnailUrl,
        isPublic: file.isPublic,
        metadata: file.metadata,
        createdAt: file.createdAt,
      }
    }),
})

export type StorageRouter = typeof storageRouter
