// ═══════════════════════════════════════════════════════════════════════════════
// Search Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
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
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const searchRouter = router({
  search: tenantProcedure
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

  index: tenantProcedure
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

  remove: tenantProcedure
    .input(removeFromIndexInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.removeFromIndex(input.entityType, input.entityId)
    }),

  bulkIndex: tenantProcedure
    .input(bulkIndexInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.bulkIndex(input.documents)
    }),

  reindex: tenantProcedure
    .input(reindexInput)
    .mutation(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.reindex(input.entityType)
    }),

  suggest: tenantProcedure
    .input(suggestInput)
    .query(async ({ input, ctx }) => {
      const service = new SearchService(ctx.db, ctx.tenantId)
      return service.suggest(input.query, input.entityTypes, input.limit)
    }),

  stats: tenantProcedure.query(async ({ ctx }) => {
    const service = new SearchService(ctx.db, ctx.tenantId)
    return service.getStats()
  }),
})

export type SearchRouter = typeof searchRouter
