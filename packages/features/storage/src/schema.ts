// ═══════════════════════════════════════════════════════════════════════════════
// Storage Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, bigint, boolean, jsonb, index, text } from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────────────────────
// Files Table
// ─────────────────────────────────────────────────────────────────────────────

export const files = pgTable("storage_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id").notNull(),
  key: varchar("key", { length: 1024 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 127 }).notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  bucket: varchar("bucket", { length: 255 }).notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("storage_files_tenant_idx").on(table.tenantId),
  index("storage_files_user_idx").on(table.userId),
  index("storage_files_key_idx").on(table.key),
  index("storage_files_bucket_idx").on(table.bucket),
  index("storage_files_mime_type_idx").on(table.mimeType),
  index("storage_files_created_at_idx").on(table.createdAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StorageFile = typeof files.$inferSelect
export type NewStorageFile = typeof files.$inferInsert
