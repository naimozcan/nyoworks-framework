// ═══════════════════════════════════════════════════════════════════════════════
// Shipping Feature - Database Schema
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { createId } from "@paralleldrive/cuid2"

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const shippingProviderEnum = pgEnum("shipping_provider", [
  "postnl",
  "dhl",
  "sendcloud",
])

export const shipmentStatusEnum = pgEnum("shipment_status", [
  "pending",
  "label_created",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "returned",
])

// ─────────────────────────────────────────────────────────────────────────────
// Shipments Table
// ─────────────────────────────────────────────────────────────────────────────

export const shipments = pgTable("shipments", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  tenantId: text("tenant_id").notNull(),
  orderId: text("order_id"),
  provider: shippingProviderEnum("provider").notNull().default("sendcloud"),
  status: shipmentStatusEnum("status").notNull().default("pending"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  labelUrl: text("label_url"),
  senderAddress: jsonb("sender_address").$type<ShippingAddress>(),
  recipientAddress: jsonb("recipient_address").$type<ShippingAddress>().notNull(),
  weight: text("weight"),
  dimensions: jsonb("dimensions").$type<ShipmentDimensions>(),
  providerData: jsonb("provider_data").$type<Record<string, unknown>>(),
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ShippingAddress {
  name: string
  company?: string
  street: string
  houseNumber: string
  houseNumberSuffix?: string
  postalCode: string
  city: string
  country: string
  phone?: string
  email?: string
}

export interface ShipmentDimensions {
  length: number
  width: number
  height: number
  unit: "cm" | "mm"
}

export type Shipment = typeof shipments.$inferSelect
export type NewShipment = typeof shipments.$inferInsert
export type ShippingProvider = "postnl" | "dhl" | "sendcloud"
export type ShipmentStatus = "pending" | "label_created" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "failed" | "returned"
