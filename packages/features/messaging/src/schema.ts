// ═══════════════════════════════════════════════════════════════════════════════
// Messaging Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, text, timestamp, boolean, jsonb, index, pgEnum } from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const conversationTypeEnum = pgEnum("conversation_type", [
  "direct",
  "group",
  "support",
  "channel",
])

export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "delivered",
  "read",
  "failed",
])

export const participantRoleEnum = pgEnum("participant_role", [
  "owner",
  "admin",
  "member",
  "guest",
])

export const supportStatusEnum = pgEnum("support_status", [
  "waiting",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
])

// ─────────────────────────────────────────────────────────────────────────────
// Conversations Table
// ─────────────────────────────────────────────────────────────────────────────

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  type: conversationTypeEnum("type").notNull().default("direct"),
  name: text("name"),
  description: text("description"),
  avatarUrl: text("avatar_url"),
  isArchived: boolean("is_archived").notNull().default(false),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  lastMessagePreview: text("last_message_preview"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("conversations_tenant_idx").on(table.tenantId),
  index("conversations_type_idx").on(table.type),
  index("conversations_last_message_idx").on(table.lastMessageAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Conversation Participants Table
// ─────────────────────────────────────────────────────────────────────────────

export const conversationParticipants = pgTable("conversation_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: participantRoleEnum("role").notNull().default("member"),
  nickname: text("nickname"),
  isMuted: boolean("is_muted").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }),
  lastReadMessageId: uuid("last_read_message_id"),
  unreadCount: text("unread_count").notNull().default("0"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  leftAt: timestamp("left_at", { withTimezone: true }),
}, (table) => [
  index("participants_conversation_idx").on(table.conversationId),
  index("participants_user_idx").on(table.userId),
  index("participants_user_conv_idx").on(table.userId, table.conversationId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Messages Table
// ─────────────────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull(),
  replyToId: uuid("reply_to_id"),
  content: text("content"),
  contentType: text("content_type").notNull().default("text"),
  status: messageStatusEnum("status").notNull().default("sent"),
  attachments: jsonb("attachments").$type<MessageAttachment[]>(),
  reactions: jsonb("reactions").$type<Record<string, string[]>>(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  isEdited: boolean("is_edited").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("messages_conversation_idx").on(table.conversationId),
  index("messages_sender_idx").on(table.senderId),
  index("messages_created_idx").on(table.createdAt),
  index("messages_reply_idx").on(table.replyToId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Message Read Receipts Table
// ─────────────────────────────────────────────────────────────────────────────

export const messageReadReceipts = pgTable("message_read_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").notNull().references(() => messages.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("read_receipts_message_idx").on(table.messageId),
  index("read_receipts_user_idx").on(table.userId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Support Conversations Table (Live Chat Extension)
// ─────────────────────────────────────────────────────────────────────────────

export const supportConversations = pgTable("support_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull(),
  visitorId: text("visitor_id"),
  visitorName: text("visitor_name"),
  visitorEmail: text("visitor_email"),
  assignedAgentId: uuid("assigned_agent_id"),
  status: supportStatusEnum("status").notNull().default("waiting"),
  priority: text("priority").notNull().default("normal"),
  category: text("category"),
  tags: jsonb("tags").$type<string[]>(),
  source: text("source").notNull().default("widget"),
  pageUrl: text("page_url"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  rating: text("rating"),
  feedback: text("feedback"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("support_conversation_idx").on(table.conversationId),
  index("support_tenant_idx").on(table.tenantId),
  index("support_agent_idx").on(table.assignedAgentId),
  index("support_status_idx").on(table.status),
  index("support_visitor_idx").on(table.visitorId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Canned Responses Table
// ─────────────────────────────────────────────────────────────────────────────

export const cannedResponses = pgTable("canned_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  shortcut: text("shortcut").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  language: text("language").notNull().default("nl"),
  isActive: boolean("is_active").notNull().default(true),
  usageCount: text("usage_count").notNull().default("0"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("canned_tenant_idx").on(table.tenantId),
  index("canned_shortcut_idx").on(table.shortcut),
  index("canned_category_idx").on(table.category),
])

// ─────────────────────────────────────────────────────────────────────────────
// Agent Availability Table
// ─────────────────────────────────────────────────────────────────────────────

export const agentAvailability = pgTable("agent_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  agentId: uuid("agent_id").notNull(),
  status: text("status").notNull().default("offline"),
  maxConcurrentChats: text("max_concurrent_chats").notNull().default("5"),
  currentChatCount: text("current_chat_count").notNull().default("0"),
  skills: jsonb("skills").$type<string[]>(),
  languages: jsonb("languages").$type<string[]>(),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("agent_tenant_idx").on(table.tenantId),
  index("agent_id_idx").on(table.agentId),
  index("agent_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageAttachment {
  id: string
  type: "image" | "file" | "audio" | "video" | "location"
  url: string
  name?: string
  size?: number
  mimeType?: string
  thumbnailUrl?: string
  metadata?: Record<string, unknown>
}

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert
export type ConversationParticipant = typeof conversationParticipants.$inferSelect
export type NewConversationParticipant = typeof conversationParticipants.$inferInsert
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type MessageReadReceipt = typeof messageReadReceipts.$inferSelect
export type SupportConversation = typeof supportConversations.$inferSelect
export type NewSupportConversation = typeof supportConversations.$inferInsert
export type CannedResponse = typeof cannedResponses.$inferSelect
export type AgentAvailability = typeof agentAvailability.$inferSelect
