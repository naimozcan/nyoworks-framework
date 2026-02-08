// ═══════════════════════════════════════════════════════════════════════════════
// Search Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import {
  SearchRepository,
  type SearchListResult,
  type SuggestResult,
  type EntityTypeCount,
} from "../repositories/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SearchInput {
  query: string
  entityTypes?: string[]
  limit: number
  offset: number
  highlight?: boolean
  highlightTag?: string
}

export interface IndexDocumentInput {
  entityType: string
  entityId: string
  content: string
  metadata?: Record<string, unknown>
}

export interface IndexResult {
  id: string
  entityType: string
  entityId: string
  createdAt: Date
}

export interface BulkIndexResult {
  indexed: number
  failed: number
  errors: Array<{ entityId: string; error: string }>
}

export interface ReindexResult {
  reindexed: number
  duration: number
}

export interface StatsResult {
  total: number
  byEntityType: EntityTypeCount[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class SearchService {
  private readonly repository: SearchRepository

  constructor(
    db: DrizzleDatabase,
    tenantId: string
  ) {
    this.repository = new SearchRepository(db, tenantId)
  }

  async search(input: SearchInput): Promise<SearchListResult> {
    return this.repository.search({
      query: input.query,
      entityTypes: input.entityTypes,
      limit: input.limit,
      offset: input.offset,
      highlight: input.highlight,
      highlightTag: input.highlightTag,
    })
  }

  async indexDocument(input: IndexDocumentInput): Promise<IndexResult> {
    const record = await this.repository.index({
      entityType: input.entityType,
      entityId: input.entityId,
      content: input.content,
      metadata: input.metadata,
    })

    return {
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      createdAt: record.createdAt,
    }
  }

  async removeFromIndex(entityType: string, entityId: string): Promise<{ success: boolean; deletedCount: number }> {
    const deletedCount = await this.repository.remove(entityType, entityId)

    return {
      success: true,
      deletedCount,
    }
  }

  async bulkIndex(documents: IndexDocumentInput[]): Promise<BulkIndexResult> {
    let indexed = 0
    const errors: Array<{ entityId: string; error: string }> = []

    for (const doc of documents) {
      try {
        await this.repository.index({
          entityType: doc.entityType,
          entityId: doc.entityId,
          content: doc.content,
          metadata: doc.metadata,
        })
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
  }

  async reindex(entityType?: string): Promise<ReindexResult> {
    const startTime = Date.now()
    const reindexed = await this.repository.reindex(entityType)

    return {
      reindexed,
      duration: Date.now() - startTime,
    }
  }

  async suggest(query: string, entityTypes?: string[], limit: number = 10): Promise<{ suggestions: SuggestResult[] }> {
    const suggestions = await this.repository.suggest(query, entityTypes, limit)

    return { suggestions }
  }

  async getStats(): Promise<StatsResult> {
    return this.repository.getStats()
  }
}
