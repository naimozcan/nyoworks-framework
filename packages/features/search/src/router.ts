// ═══════════════════════════════════════════════════════════════════════════════
// Search Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, sql } from "drizzle-orm"
import {
  searchInput,
  indexDocumentInput,
  removeFromIndexInput,
  bulkIndexInput,
  reindexInput,
  suggestInput,
} from "./validators.js"
import { searchIndex } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

type DrizzleDB = {
  select: (...args: unknown[]) => { from: (...args: unknown[]) => unknown }
  insert: (...args: unknown[]) => { values: (...args: unknown[]) => unknown }
  update: (...args: unknown[]) => { set: (...args: unknown[]) => unknown }
  delete: (...args: unknown[]) => { where: (...args: unknown[]) => unknown }
  execute: <T>(query: unknown) => Promise<{ rows: T[] }>
}

interface SearchContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: DrizzleDB
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
// Helper Type
// ─────────────────────────────────────────────────────────────────────────────

function getDb(ctx: { db: DrizzleDB }) {
  return ctx.db as unknown as {
    select: (columns?: Record<string, unknown>) => {
      from: (table: unknown) => {
        where: (condition: unknown) => {
          limit: (n: number) => Promise<unknown[]>
          orderBy: (...columns: unknown[]) => { limit: (n: number) => { offset: (n: number) => Promise<unknown[]> } }
        }
        limit: (n: number) => Promise<unknown[]>
      }
    }
    insert: (table: unknown) => {
      values: (data: unknown) => {
        returning: () => Promise<unknown[]>
      }
    }
    update: (table: unknown) => {
      set: (data: unknown) => {
        where: (condition: unknown) => {
          returning: () => Promise<unknown[]>
        }
      }
    }
    delete: (table: unknown) => {
      where: (condition: unknown) => {
        returning: () => Promise<unknown[]>
      }
    }
    execute: <T>(query: unknown) => Promise<{ rows: T[] }>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const searchRouter = t.router({
  search: protectedProcedure
    .input(searchInput)
    .query(async ({ input, ctx }) => {
      const { query, entityTypes, limit, offset, highlight, highlightTag } = input
      const db = getDb(ctx)

      const tsQuery = sql`plainto_tsquery('english', ${query})`

      let whereClause = sql`${searchIndex.tenantId} = ${ctx.tenantId} AND ${searchIndex.searchVector} @@ ${tsQuery}`

      if (entityTypes && entityTypes.length > 0) {
        whereClause = sql`${whereClause} AND ${searchIndex.entityType} = ANY(${entityTypes})`
      }

      const rankExpression = sql`ts_rank(${searchIndex.searchVector}, ${tsQuery})`

      const headlineExpression = highlight
        ? sql`ts_headline('english', ${searchIndex.content}, ${tsQuery}, 'StartSel=${highlightTag}, StopSel=</${highlightTag.slice(1)}, MaxWords=35, MinWords=15')`
        : sql`NULL`

      const results = await db.execute<Record<string, unknown>>(sql`
        SELECT
          ${searchIndex.id},
          ${searchIndex.entityType},
          ${searchIndex.entityId},
          ${searchIndex.content},
          ${headlineExpression} as headline,
          ${rankExpression} as rank,
          ${searchIndex.metadata}
        FROM ${searchIndex}
        WHERE ${whereClause}
        ORDER BY ${rankExpression} DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `)

      const countResult = await db.execute<{ total: string | number }>(sql`
        SELECT COUNT(*) as total
        FROM ${searchIndex}
        WHERE ${whereClause}
      `)

      const total = Number(countResult.rows[0]?.total || 0)

      return {
        items: results.rows.map((row) => ({
          id: row.id as string,
          entityType: row.entity_type as string,
          entityId: row.entity_id as string,
          content: row.content as string,
          headline: row.headline as string | null,
          rank: Number(row.rank),
          metadata: row.metadata as Record<string, unknown> | null,
        })),
        total,
        hasMore: offset + limit < total,
      }
    }),

  index: protectedProcedure
    .input(indexDocumentInput)
    .mutation(async ({ input, ctx }) => {
      const { entityType, entityId, content, metadata } = input
      const db = getDb(ctx)

      const existing = await db
        .select()
        .from(searchIndex)
        .where(
          and(
            eq(searchIndex.tenantId, ctx.tenantId),
            eq(searchIndex.entityType, entityType),
            eq(searchIndex.entityId, entityId)
          )
        )
        .limit(1) as unknown as { id: string }[]

      if (existing[0]) {
        const updated = await db
          .update(searchIndex)
          .set({
            content,
            metadata,
            searchVector: sql`to_tsvector('english', ${content})`,
            updatedAt: new Date(),
          })
          .where(eq(searchIndex.id, existing[0].id))
          .returning() as unknown as Array<{
            id: string
            entityType: string
            entityId: string
            createdAt: Date
          }>

        const record = updated[0]!
        return {
          id: record.id,
          entityType: record.entityType,
          entityId: record.entityId,
          createdAt: record.createdAt,
        }
      }

      const created = await db
        .insert(searchIndex)
        .values({
          tenantId: ctx.tenantId,
          entityType,
          entityId,
          content,
          metadata,
          searchVector: sql`to_tsvector('english', ${content})`,
        })
        .returning() as unknown as Array<{
          id: string
          entityType: string
          entityId: string
          createdAt: Date
        }>

      const record = created[0]!
      return {
        id: record.id,
        entityType: record.entityType,
        entityId: record.entityId,
        createdAt: record.createdAt,
      }
    }),

  remove: protectedProcedure
    .input(removeFromIndexInput)
    .mutation(async ({ input, ctx }) => {
      const { entityType, entityId } = input
      const db = getDb(ctx)

      const deleted = await db
        .delete(searchIndex)
        .where(
          and(
            eq(searchIndex.tenantId, ctx.tenantId),
            eq(searchIndex.entityType, entityType),
            eq(searchIndex.entityId, entityId)
          )
        )
        .returning() as unknown[]

      return {
        success: true,
        deletedCount: deleted.length,
      }
    }),

  bulkIndex: protectedProcedure
    .input(bulkIndexInput)
    .mutation(async ({ input, ctx }) => {
      const { documents } = input
      const db = getDb(ctx)

      let indexed = 0
      const errors: Array<{ entityId: string; error: string }> = []

      for (const doc of documents) {
        try {
          const existing = await db
            .select({ id: searchIndex.id })
            .from(searchIndex)
            .where(
              and(
                eq(searchIndex.tenantId, ctx.tenantId),
                eq(searchIndex.entityType, doc.entityType),
                eq(searchIndex.entityId, doc.entityId)
              )
            )
            .limit(1) as unknown as { id: string }[]

          if (existing[0]) {
            await db
              .update(searchIndex)
              .set({
                content: doc.content,
                metadata: doc.metadata,
                searchVector: sql`to_tsvector('english', ${doc.content})`,
                updatedAt: new Date(),
              })
              .where(eq(searchIndex.id, existing[0].id))
              .returning()
          } else {
            await db
              .insert(searchIndex)
              .values({
                tenantId: ctx.tenantId,
                entityType: doc.entityType,
                entityId: doc.entityId,
                content: doc.content,
                metadata: doc.metadata,
                searchVector: sql`to_tsvector('english', ${doc.content})`,
              })
              .returning()
          }

          indexed++
        } catch (err) {
          errors.push({
            entityId: doc.entityId,
            error: err instanceof Error ? err.message : "Unknown error",
          })
        }
      }

      return {
        indexed,
        failed: errors.length,
        errors,
      }
    }),

  reindex: protectedProcedure
    .input(reindexInput)
    .mutation(async ({ input, ctx }) => {
      const { entityType } = input
      const db = getDb(ctx)
      const startTime = Date.now()

      let whereClause = eq(searchIndex.tenantId, ctx.tenantId)

      if (entityType) {
        whereClause = and(whereClause, eq(searchIndex.entityType, entityType)) as typeof whereClause
      }

      await db.execute(sql`
        UPDATE ${searchIndex}
        SET
          search_vector = to_tsvector('english', content),
          updated_at = NOW()
        WHERE tenant_id = ${ctx.tenantId}
        ${entityType ? sql`AND entity_type = ${entityType}` : sql``}
      `)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(searchIndex)
        .where(whereClause)
        .limit(1) as unknown as { count: number }[]

      return {
        reindexed: countResult[0]?.count || 0,
        duration: Date.now() - startTime,
      }
    }),

  suggest: protectedProcedure
    .input(suggestInput)
    .query(async ({ input, ctx }) => {
      const { query, entityTypes, limit } = input
      const db = getDb(ctx)

      const prefixQuery = `${query}:*`

      let whereClause = sql`${searchIndex.tenantId} = ${ctx.tenantId} AND ${searchIndex.searchVector} @@ to_tsquery('english', ${prefixQuery})`

      if (entityTypes && entityTypes.length > 0) {
        whereClause = sql`${whereClause} AND ${searchIndex.entityType} = ANY(${entityTypes})`
      }

      const results = await db.execute<Record<string, unknown>>(sql`
        SELECT
          ${searchIndex.entityType} as entity_type,
          substring(${searchIndex.content} for 100) as text,
          COUNT(*) as count
        FROM ${searchIndex}
        WHERE ${whereClause}
        GROUP BY ${searchIndex.entityType}, substring(${searchIndex.content} for 100)
        ORDER BY count DESC
        LIMIT ${limit}
      `)

      return {
        suggestions: results.rows.map((row) => ({
          text: row.text as string,
          entityType: row.entity_type as string,
          count: Number(row.count),
        })),
      }
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb(ctx)

    const results = await db.execute<Record<string, unknown>>(sql`
      SELECT
        ${searchIndex.entityType} as entity_type,
        COUNT(*) as count
      FROM ${searchIndex}
      WHERE ${searchIndex.tenantId} = ${ctx.tenantId}
      GROUP BY ${searchIndex.entityType}
      ORDER BY count DESC
    `)

    const totalResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(searchIndex)
      .where(eq(searchIndex.tenantId, ctx.tenantId))
      .limit(1) as unknown as { total: number }[]

    return {
      total: totalResult[0]?.total || 0,
      byEntityType: results.rows.map((row) => ({
        entityType: row.entity_type as string,
        count: Number(row.count),
      })),
    }
  }),
})

export type SearchRouter = typeof searchRouter
