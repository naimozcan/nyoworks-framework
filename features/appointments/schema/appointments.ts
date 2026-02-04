// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, varchar, timestamp, text, jsonb, index } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { tenants, users } from "../../../core/database/schema"

// ─────────────────────────────────────────────────────────────────────────────
// Table Definition
// ─────────────────────────────────────────────────────────────────────────────

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: uuid("provider_id").references(() => users.id, { onDelete: "set null" }),
  serviceId: uuid("service_id"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata").default({}),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointments_tenant_idx").on(table.tenantId),
  index("appointments_customer_idx").on(table.customerId),
  index("appointments_provider_idx").on(table.providerId),
  index("appointments_status_idx").on(table.status),
  index("appointments_start_time_idx").on(table.startTime),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [appointments.tenantId],
    references: [tenants.id],
  }),
  customer: one(users, {
    fields: [appointments.customerId],
    references: [users.id],
  }),
  provider: one(users, {
    fields: [appointments.providerId],
    references: [users.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert

export const AppointmentStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELED: "canceled",
  NO_SHOW: "no_show",
} as const
