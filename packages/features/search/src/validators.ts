// ═══════════════════════════════════════════════════════════════════════════════
// Search Feature - Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Search Input
// ─────────────────────────────────────────────────────────────────────────────

export const searchInput = z.object({
  query: z.string().min(1).max(500),
  entityTypes: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  highlight: z.boolean().default(true),
  highlightTag: z.string().default("<mark>"),
})

export const searchOutput = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    entityType: z.string(),
    entityId: z.string().uuid(),
    content: z.string(),
    headline: z.string().nullable(),
    rank: z.number(),
    metadata: z.record(z.unknown()).nullable(),
  })),
  total: z.number(),
  hasMore: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Index Document
// ─────────────────────────────────────────────────────────────────────────────

export const indexDocumentInput = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
})

export const indexDocumentOutput = z.object({
  id: z.string().uuid(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  createdAt: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Remove From Index
// ─────────────────────────────────────────────────────────────────────────────

export const removeFromIndexInput = z.object({
  entityType: z.string().min(1).max(100),
  entityId: z.string().uuid(),
})

export const removeFromIndexOutput = z.object({
  success: z.boolean(),
  deletedCount: z.number(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Bulk Index
// ─────────────────────────────────────────────────────────────────────────────

export const bulkIndexInput = z.object({
  documents: z.array(z.object({
    entityType: z.string().min(1).max(100),
    entityId: z.string().uuid(),
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
  })).min(1).max(1000),
})

export const bulkIndexOutput = z.object({
  indexed: z.number(),
  failed: z.number(),
  errors: z.array(z.object({
    entityId: z.string(),
    error: z.string(),
  })),
})

// ─────────────────────────────────────────────────────────────────────────────
// Reindex
// ─────────────────────────────────────────────────────────────────────────────

export const reindexInput = z.object({
  entityType: z.string().min(1).max(100).optional(),
})

export const reindexOutput = z.object({
  reindexed: z.number(),
  duration: z.number(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Suggest
// ─────────────────────────────────────────────────────────────────────────────

export const suggestInput = z.object({
  query: z.string().min(1).max(100),
  entityTypes: z.array(z.string()).optional(),
  limit: z.number().min(1).max(20).default(5),
})

export const suggestOutput = z.object({
  suggestions: z.array(z.object({
    text: z.string(),
    entityType: z.string(),
    count: z.number(),
  })),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SearchInput = z.infer<typeof searchInput>
export type SearchOutput = z.infer<typeof searchOutput>
export type IndexDocumentInput = z.infer<typeof indexDocumentInput>
export type IndexDocumentOutput = z.infer<typeof indexDocumentOutput>
export type RemoveFromIndexInput = z.infer<typeof removeFromIndexInput>
export type RemoveFromIndexOutput = z.infer<typeof removeFromIndexOutput>
export type BulkIndexInput = z.infer<typeof bulkIndexInput>
export type BulkIndexOutput = z.infer<typeof bulkIndexOutput>
export type ReindexInput = z.infer<typeof reindexInput>
export type ReindexOutput = z.infer<typeof reindexOutput>
export type SuggestInput = z.infer<typeof suggestInput>
export type SuggestOutput = z.infer<typeof suggestOutput>
