// ═══════════════════════════════════════════════════════════════════════════════
// CRM Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, uuid, jsonb, boolean, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// ─────────────────────────────────────────────────────────────────────────────
// Contacts Table
// ─────────────────────────────────────────────────────────────────────────────

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),

  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),

  status: text("status").notNull().default("active"),
  source: text("source"),

  avatarUrl: text("avatar_url"),
  customFields: jsonb("custom_fields").$type<Record<string, unknown>>(),

  ownerId: uuid("owner_id"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Tags Table
// ─────────────────────────────────────────────────────────────────────────────

export const tags = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),

  name: text("name").notNull(),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Contact Tags Junction Table
// ─────────────────────────────────────────────────────────────────────────────

export const contactTags = pgTable("contact_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notes Table
// ─────────────────────────────────────────────────────────────────────────────

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),

  content: text("content").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),

  authorId: uuid("author_id").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Activities Table
// ─────────────────────────────────────────────────────────────────────────────

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),

  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),

  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),

  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  userId: uuid("user_id").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Deals Table
// ─────────────────────────────────────────────────────────────────────────────

export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),

  title: text("title").notNull(),
  value: integer("value"),
  currency: text("currency").notNull().default("USD"),

  stage: text("stage").notNull().default("lead"),
  probability: integer("probability").default(0),

  expectedCloseDate: timestamp("expected_close_date"),
  closedAt: timestamp("closed_at"),

  ownerId: uuid("owner_id"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const contactsRelations = relations(contacts, ({ many }) => ({
  tags: many(contactTags),
  notes: many(notes),
  activities: many(activities),
  deals: many(deals),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  contacts: many(contactTags),
}))

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactTags.contactId],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tagId],
    references: [tags.id],
  }),
}))

export const notesRelations = relations(notes, ({ one }) => ({
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
}))

export const activitiesRelations = relations(activities, ({ one }) => ({
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
}))

export const dealsRelations = relations(deals, ({ one }) => ({
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
}))
