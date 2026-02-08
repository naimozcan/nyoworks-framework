// ═══════════════════════════════════════════════════════════════════════════════
// i18n Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Translations Table
// ─────────────────────────────────────────────────────────────────────────────

export const translations = pgTable("translations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),

  locale: text("locale").notNull(),
  namespace: text("namespace").notNull().default("common"),
  key: text("key").notNull(),
  value: text("value").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("translations_tenant_idx").on(table.tenantId),
  index("translations_locale_idx").on(table.locale),
  index("translations_namespace_idx").on(table.namespace),
  uniqueIndex("translations_unique_idx").on(table.tenantId, table.locale, table.namespace, table.key),
])

// ─────────────────────────────────────────────────────────────────────────────
// Locales Table
// ─────────────────────────────────────────────────────────────────────────────

export const locales = pgTable("locales", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),

  code: text("code").notNull(),
  name: text("name").notNull(),
  nativeName: text("native_name").notNull(),
  isDefault: text("is_default").notNull().default("false"),
  isEnabled: text("is_enabled").notNull().default("true"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("locales_tenant_idx").on(table.tenantId),
  uniqueIndex("locales_unique_idx").on(table.tenantId, table.code),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const translationsRelations = relations(translations, () => ({}))

export const localesRelations = relations(locales, () => ({}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Translation = typeof translations.$inferSelect
export type NewTranslation = typeof translations.$inferInsert
export type Locale = typeof locales.$inferSelect
export type NewLocale = typeof locales.$inferInsert
