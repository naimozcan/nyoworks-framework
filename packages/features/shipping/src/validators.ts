// ═══════════════════════════════════════════════════════════════════════════════
// Shipping Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Address Validators
// ─────────────────────────────────────────────────────────────────────────────

export const shippingAddressSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  street: z.string().min(1),
  houseNumber: z.string().min(1),
  houseNumberSuffix: z.string().optional(),
  postalCode: z.string().min(1),
  city: z.string().min(1),
  country: z.string().length(2).default("NL"),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

export const shipmentDimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  unit: z.enum(["cm", "mm"]).default("cm"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Shipment Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createShipmentSchema = z.object({
  orderId: z.string().optional(),
  provider: z.enum(["postnl", "dhl", "sendcloud"]).default("sendcloud"),
  senderAddress: shippingAddressSchema.optional(),
  recipientAddress: shippingAddressSchema,
  weight: z.string().optional(),
  dimensions: shipmentDimensionsSchema.optional(),
})

export const updateShipmentSchema = z.object({
  status: z.enum(["pending", "label_created", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed", "returned"]).optional(),
  trackingNumber: z.string().optional(),
  trackingUrl: z.string().url().optional(),
  labelUrl: z.string().url().optional(),
  estimatedDelivery: z.date().optional(),
  deliveredAt: z.date().optional(),
})

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>
