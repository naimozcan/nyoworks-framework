// ═══════════════════════════════════════════════════════════════════════════════
// Search Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, sql } from "drizzle-orm"
import { searchIndex, type SearchIndex } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchQueryOptions {
  query: string
  entityTypes?: string[]
  limit: number
  offset: number
  highlight?: boolean
  highlightTag?: string
}

export interface SearchResult {
  id: string
  entityType: string
  entityId: string
  content: string
  headline: string | null
  rank: number
  metadata: Record<string, unknown> | null
}

export interface SearchListResult {
  items: SearchResult[]
  total: number
  hasMore: boolean
}

export interface SuggestResult {
  text: string
  entityType: string
  count: number
}

export interface EntityTypeCount {
  entityType: string
  count: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class SearchRepository {
  constructor(
    private readonly db: any,
    private readonly tenantId: string
  ) {}

  async search(options: SearchQueryOptions): Promise<SearchListResult> {
    const { query, entityTypes, limit, offset, highlight, highlightTag = "<mark>" } = options

    const tsQuery = sql`plainto_tsquery('english', ${query})`

    let whereClause = sql`${searchIndex.tenantId} = ${this.tenantId} AND ${searchIndex.searchVector} @@ ${tsQuery}`

    if (entityTypes && entityTypes.length > 0) {
      whereClause = sql`${whereClause} AND ${searchIndex.entityType} = ANY(${entityTypes})`
    }

    const rankExpression = sql`ts_rank(${searchIndex.searchVector}, ${tsQuery})`

    const headlineExpression = highlight
      ? sql`ts_headline('english', ${searchIndex.content}, ${tsQuery}, 'StartSel=${highlightTag}, StopSel=</${highlightTag.slice(1)}, MaxWords=35, MinWords=15')`
      : sql`NULL`

    const results = await this.db.execute(sql`
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

    const countResult = await this.db.execute(sql`
      SELECT COUNT(*) as total
      FROM ${searchIndex}
      WHERE ${whereClause}
    `)

    const total = Number(countResult.rows[0]?.total || 0)

    return {
      items: results.rows.map((row: any) => ({
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
  }

  async findByEntity(entityType: string, entityId: string): Promise<SearchIndex | null> {
    const [result] = await this.db
      .select()
      .from(searchIndex)
      .where(
        and(
          eq(searchIndex.tenantId, this.tenantId),
          eq(searchIndex.entityType, entityType),
          eq(searchIndex.entityId, entityId)
        )
      )
      .limit(1)

    return result ?? null
  }

  async index(data: {
    entityType: string
    entityId: string
    content: string
    metadata?: Record<string, unknown>
  }): Promise<SearchIndex> {
    const existing = await this.findByEntity(data.entityType, data.entityId)

    if (existing) {
      const [updated] = await this.db
        .update(searchIndex)
        .set({
          content: data.content,
          metadata: data.metadata,
          searchVector: sql`to_tsvector('english', ${data.content})`,
          updatedAt: new Date(),
        })
        .where(eq(searchIndex.id, existing.id))
        .returning()

      return updated
    }

    const [created] = await this.db
      .insert(searchIndex)
      .values({
        tenantId: this.tenantId,
        entityType: data.entityType,
        entityId: data.entityId,
        content: data.content,
        metadata: data.metadata,
        searchVector: sql`to_tsvector('english', ${data.content})`,
      })
      .returning()

    return created
  }

  async remove(entityType: string, entityId: string): Promise<number> {
    const deleted = await this.db
      .delete(searchIndex)
      .where(
        and(
          eq(searchIndex.tenantId, this.tenantId),
          eq(searchIndex.entityType, entityType),
          eq(searchIndex.entityId, entityId)
        )
      )
      .returning()

    return deleted.length
  }

  async reindex(entityType?: string): Promise<number> {
    await this.db.execute(sql`
      UPDATE ${searchIndex}
      SET
        search_vector = to_tsvector('english', content),
        updated_at = NOW()
      WHERE tenant_id = ${this.tenantId}
      ${entityType ? sql`AND entity_type = ${entityType}` : sql``}
    `)

    let whereClause: any = eq(searchIndex.tenantId, this.tenantId)
    if (entityType) {
      whereClause = and(whereClause, eq(searchIndex.entityType, entityType))
    }

    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(searchIndex)
      .where(whereClause)
      .limit(1)

    return countResult?.count ?? 0
  }

  async suggest(query: string, entityTypes?: string[], limit: number = 10): Promise<SuggestResult[]> {
    const prefixQuery = `${query}:*`

    let whereClause = sql`${searchIndex.tenantId} = ${this.tenantId} AND ${searchIndex.searchVector} @@ to_tsquery('english', ${prefixQuery})`

    if (entityTypes && entityTypes.length > 0) {
      whereClause = sql`${whereClause} AND ${searchIndex.entityType} = ANY(${entityTypes})`
    }

    const results = await this.db.execute(sql`
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

    return results.rows.map((row: any) => ({
      text: row.text as string,
      entityType: row.entity_type as string,
      count: Number(row.count),
    }))
  }

  async getStats(): Promise<{ total: number; byEntityType: EntityTypeCount[] }> {
    const results = await this.db.execute(sql`
      SELECT
        ${searchIndex.entityType} as entity_type,
        COUNT(*) as count
      FROM ${searchIndex}
      WHERE ${searchIndex.tenantId} = ${this.tenantId}
      GROUP BY ${searchIndex.entityType}
      ORDER BY count DESC
    `)

    const [totalResult] = await this.db
      .select({ total: sql<number>`count(*)` })
      .from(searchIndex)
      .where(eq(searchIndex.tenantId, this.tenantId))
      .limit(1)

    return {
      total: totalResult?.total ?? 0,
      byEntityType: results.rows.map((row: any) => ({
        entityType: row.entity_type as string,
        count: Number(row.count),
      })),
    }
  }
}
