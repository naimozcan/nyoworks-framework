// ═══════════════════════════════════════════════════════════════════════════════
// Search Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  searchInput,
  indexDocumentInput,
  removeFromIndexInput,
  bulkIndexInput,
  reindexInput,
  suggestInput,
} from "./validators.js"
import { SearchService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface SearchContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: unknown
}

const t = initTRPC.context<SearchContext>().create()

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

export const searchRouter = t.router({
  search: protectedProcedure
    .input(searchInput)
    .query(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.search({
        query: input.query,
        entityTypes: input.entityTypes,
        limit: input.limit,
        offset: input.offset,
        highlight: input.highlight,
        highlightTag: input.highlightTag,
      })
    }),

  index: protectedProcedure
    .input(indexDocumentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.indexDocument({
        entityType: input.entityType,
        entityId: input.entityId,
        content: input.content,
        metadata: input.metadata,
      })
    }),

  remove: protectedProcedure
    .input(removeFromIndexInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.removeFromIndex(input.entityType, input.entityId)
    }),

  bulkIndex: protectedProcedure
    .input(bulkIndexInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.bulkIndex(input.documents)
    }),

  reindex: protectedProcedure
    .input(reindexInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.reindex(input.entityType)
    }),

  suggest: protectedProcedure
    .input(suggestInput)
    .query(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.suggest(input.query, input.entityTypes, input.limit)
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const service = new SearchService(ctx.db, ctx.tenantId)
    return service.getStats()
  }),
})

export type SearchRouter = typeof searchRouter
