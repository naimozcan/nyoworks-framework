// ═══════════════════════════════════════════════════════════════════════════════
// Services Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, integer, text, boolean, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentServices = pgTable("appointment_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: integer("price").default(0),
  currency: varchar("currency", { length: 3 }).default("USD"),
  color: varchar("color", { length: 7 }),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointment_services_tenant_idx").on(table.tenantId),
  index("appointment_services_active_idx").on(table.isActive),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentServicesRelations = relations(appointmentServices, ({ one }) => ({
  tenant: one(tenants, {
    fields: [appointmentServices.tenantId],
    references: [tenants.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AppointmentService = typeof appointmentServices.$inferSelect
export type NewAppointmentService = typeof appointmentServices.$inferInsert
