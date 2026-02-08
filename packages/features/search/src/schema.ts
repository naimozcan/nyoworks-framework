// ═══════════════════════════════════════════════════════════════════════════════
// Search Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, jsonb, index, customType } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Custom Types
// ─────────────────────────────────────────────────────────────────────────────

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector"
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// Search Index Table
// ─────────────────────────────────────────────────────────────────────────────

export const searchIndex = pgTable("search_index", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),

  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: text("entity_id").notNull(),

  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  searchVector: tsvector("search_vector"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("search_index_tenant_idx").on(table.tenantId),
  index("search_index_entity_type_idx").on(table.entityType),
  index("search_index_entity_idx").on(table.entityType, table.entityId),
  index("search_index_vector_idx").using("gin", table.searchVector),
])

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SearchIndex = typeof searchIndex.$inferSelect
export type NewSearchIndex = typeof searchIndex.$inferInsert
