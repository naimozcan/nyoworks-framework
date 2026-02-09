// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, jsonb, pgEnum, boolean } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const messageStatusEnum = pgEnum("whatsapp_message_status", [
  "pending",
  "sent",
  "delivered",
  "read",
  "failed",
])

export const messageTypeEnum = pgEnum("whatsapp_message_type", [
  "text",
  "template",
  "image",
  "document",
  "interactive",
])

export const conversationTypeEnum = pgEnum("whatsapp_conversation_type", [
  "marketing",
  "utility",
  "service",
  "authentication",
])

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Messages Table
// ─────────────────────────────────────────────────────────────────────────────

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  waMessageId: text("wa_message_id"),
  phoneNumberId: text("phone_number_id").notNull(),
  to: text("to").notNull(),
  from: text("from"),
  type: messageTypeEnum("type").notNull().default("text"),
  status: messageStatusEnum("status").notNull().default("pending"),
  conversationType: conversationTypeEnum("conversation_type"),
  content: jsonb("content").$type<MessageContent>().notNull(),
  templateName: text("template_name"),
  templateLanguage: text("template_language"),
  isIncoming: boolean("is_incoming").default(false),
  error: text("error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Contacts Table
// ─────────────────────────────────────────────────────────────────────────────

export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  waId: text("wa_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  profileName: text("profile_name"),
  customerId: text("customer_id"),
  optedIn: boolean("opted_in").default(false),
  optedInAt: timestamp("opted_in_at", { withTimezone: true }),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MessageContent {
  text?: string
  template?: TemplateContent
  image?: MediaContent
  document?: MediaContent
  interactive?: InteractiveContent
}

export interface TemplateContent {
  name: string
  language: string
  components?: TemplateComponent[]
}

export interface TemplateComponent {
  type: "header" | "body" | "button"
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  type: "text" | "currency" | "date_time" | "image" | "document"
  text?: string
  currency?: { fallback_value: string; code: string; amount_1000: number }
  date_time?: { fallback_value: string }
  image?: { link: string }
  document?: { link: string }
}

export interface MediaContent {
  link: string
  caption?: string
  filename?: string
}

export interface InteractiveContent {
  type: "button" | "list"
  header?: { type: "text"; text: string }
  body: { text: string }
  footer?: { text: string }
  action: InteractiveAction
}

export interface InteractiveAction {
  buttons?: { type: "reply"; reply: { id: string; title: string } }[]
  sections?: { title: string; rows: { id: string; title: string; description?: string }[] }[]
}

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect
export type NewWhatsAppMessage = typeof whatsappMessages.$inferInsert
export type WhatsAppContact = typeof whatsappContacts.$inferSelect
export type NewWhatsAppContact = typeof whatsappContacts.$inferInsert
