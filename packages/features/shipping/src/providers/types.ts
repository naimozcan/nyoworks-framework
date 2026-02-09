// ═══════════════════════════════════════════════════════════════════════════════
// Shipping Providers - Common Types
// ═══════════════════════════════════════════════════════════════════════════════

import type { ShippingAddress, ShipmentDimensions } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Provider Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface ShippingProviderInterface {
  createLabel(params: CreateLabelParams): Promise<CreateLabelResult>
  getTrackingInfo(trackingNumber: string): Promise<TrackingInfo>
  cancelShipment(shipmentId: string): Promise<{ success: boolean }>
}

export interface CreateLabelParams {
  senderAddress: ShippingAddress
  recipientAddress: ShippingAddress
  weight: number
  dimensions?: ShipmentDimensions
  serviceType?: string
}

export interface CreateLabelResult {
  success: boolean
  labelUrl?: string
  trackingNumber?: string
  trackingUrl?: string
  error?: string
}

export interface TrackingInfo {
  status: string
  statusDescription: string
  events: TrackingEvent[]
  estimatedDelivery?: Date
  deliveredAt?: Date
}

export interface TrackingEvent {
  timestamp: Date
  status: string
  description: string
  location?: string
}
