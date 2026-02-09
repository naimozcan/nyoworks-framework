// ═══════════════════════════════════════════════════════════════════════════════
// AI Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, jsonb, pgEnum, integer } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const conversationStatusEnum = pgEnum("ai_conversation_status", [
  "active",
  "ended",
  "archived",
])

export const messageRoleEnum = pgEnum("ai_message_role", [
  "user",
  "assistant",
  "system",
])

// ─────────────────────────────────────────────────────────────────────────────
// AI Conversations Table
// ─────────────────────────────────────────────────────────────────────────────

export const aiConversations = pgTable("ai_conversations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id"),
  sessionId: text("session_id").notNull(),
  title: text("title"),
  status: conversationStatusEnum("status").notNull().default("active"),
  context: jsonb("context").$type<ConversationContext>(),
  messageCount: integer("message_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
})

// ─────────────────────────────────────────────────────────────────────────────
// AI Messages Table
// ─────────────────────────────────────────────────────────────────────────────

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  conversationId: text("conversation_id").notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<MessageMetadata>(),
  tokenCount: integer("token_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// AI Prompts Table (System Prompts for Different Use Cases)
// ─────────────────────────────────────────────────────────────────────────────

export const aiPrompts = pgTable("ai_prompts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  parameters: jsonb("parameters").$type<Record<string, unknown>>(),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ConversationContext {
  appType?: string
  pageContext?: string
  userLanguage?: string
  customData?: Record<string, unknown>
}

export interface MessageMetadata {
  modelUsed?: string
  processingTime?: number
  functionCalls?: FunctionCall[]
  sources?: string[]
}

export interface FunctionCall {
  name: string
  arguments: Record<string, unknown>
  result?: unknown
}

export type AIConversation = typeof aiConversations.$inferSelect
export type NewAIConversation = typeof aiConversations.$inferInsert
export type AIMessage = typeof aiMessages.$inferSelect
export type NewAIMessage = typeof aiMessages.$inferInsert
export type AIPrompt = typeof aiPrompts.$inferSelect
export type NewAIPrompt = typeof aiPrompts.$inferInsert
