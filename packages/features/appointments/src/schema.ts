// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, varchar, timestamp, integer, boolean, jsonb, index, time } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Services Table
// ─────────────────────────────────────────────────────────────────────────────

export const services = pgTable("appointment_services", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  duration: integer("duration").notNull(),
  price: integer("price"),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointment_services_tenant_idx").on(table.tenantId),
  index("appointment_services_active_idx").on(table.isActive),
])

// ─────────────────────────────────────────────────────────────────────────────
// Providers Table
// ─────────────────────────────────────────────────────────────────────────────

export const providers = pgTable("appointment_providers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id"),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointment_providers_tenant_idx").on(table.tenantId),
  index("appointment_providers_user_idx").on(table.userId),
  index("appointment_providers_active_idx").on(table.isActive),
])

// ─────────────────────────────────────────────────────────────────────────────
// Provider Services Junction Table
// ─────────────────────────────────────────────────────────────────────────────

export const providerServices = pgTable("appointment_provider_services", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointment_provider_services_provider_idx").on(table.providerId),
  index("appointment_provider_services_service_idx").on(table.serviceId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Availability Table
// ─────────────────────────────────────────────────────────────────────────────

export const availability = pgTable("appointment_availability", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointment_availability_provider_idx").on(table.providerId),
  index("appointment_availability_day_idx").on(table.dayOfWeek),
])

// ─────────────────────────────────────────────────────────────────────────────
// Appointments Table
// ─────────────────────────────────────────────────────────────────────────────

export const appointments = pgTable("appointments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  userId: text("user_id").notNull(),
  providerId: text("provider_id").notNull().references(() => providers.id, { onDelete: "restrict" }),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "restrict" }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("appointments_tenant_idx").on(table.tenantId),
  index("appointments_user_idx").on(table.userId),
  index("appointments_provider_idx").on(table.providerId),
  index("appointments_service_idx").on(table.serviceId),
  index("appointments_status_idx").on(table.status),
  index("appointments_start_time_idx").on(table.startTime),
])

// ─────────────────────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────────────────────

export const servicesRelations = relations(services, ({ many }) => ({
  providerServices: many(providerServices),
  appointments: many(appointments),
}))

export const providersRelations = relations(providers, ({ many }) => ({
  providerServices: many(providerServices),
  availability: many(availability),
  appointments: many(appointments),
}))

export const providerServicesRelations = relations(providerServices, ({ one }) => ({
  provider: one(providers, {
    fields: [providerServices.providerId],
    references: [providers.id],
  }),
  service: one(services, {
    fields: [providerServices.serviceId],
    references: [services.id],
  }),
}))

export const availabilityRelations = relations(availability, ({ one }) => ({
  provider: one(providers, {
    fields: [availability.providerId],
    references: [providers.id],
  }),
}))

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  provider: one(providers, {
    fields: [appointments.providerId],
    references: [providers.id],
  }),
  service: one(services, {
    fields: [appointments.serviceId],
    references: [services.id],
  }),
}))

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Service = typeof services.$inferSelect
export type NewService = typeof services.$inferInsert
export type Provider = typeof providers.$inferSelect
export type NewProvider = typeof providers.$inferInsert
export type ProviderService = typeof providerServices.$inferSelect
export type NewProviderService = typeof providerServices.$inferInsert
export type Availability = typeof availability.$inferSelect
export type NewAvailability = typeof availability.$inferInsert
export type Appointment = typeof appointments.$inferSelect
export type NewAppointment = typeof appointments.$inferInsert
