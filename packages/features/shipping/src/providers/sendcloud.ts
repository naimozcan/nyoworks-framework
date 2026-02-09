// ═══════════════════════════════════════════════════════════════════════════════
// Sendcloud Provider - Multi-carrier Shipping Platform
// ═══════════════════════════════════════════════════════════════════════════════

import type { ShippingProviderInterface, CreateLabelParams, CreateLabelResult, TrackingInfo } from "./types.js"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface SendcloudConfig {
  publicKey: string
  secretKey: string
}

let sendcloudConfig: SendcloudConfig | null = null

export function configureSendcloud(config: SendcloudConfig) {
  sendcloudConfig = config
}

function getConfig(): SendcloudConfig {
  if (!sendcloudConfig) {
    const publicKey = process.env.SENDCLOUD_PUBLIC_KEY
    const secretKey = process.env.SENDCLOUD_SECRET_KEY

    if (!publicKey || !secretKey) {
      throw new Error("Sendcloud not configured. Set SENDCLOUD_PUBLIC_KEY and SENDCLOUD_SECRET_KEY")
    }

    sendcloudConfig = { publicKey, secretKey }
  }
  return sendcloudConfig
}

function getAuthHeader(): string {
  const config = getConfig()
  return `Basic ${Buffer.from(`${config.publicKey}:${config.secretKey}`).toString("base64")}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Sendcloud Provider Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const sendcloudProvider: ShippingProviderInterface = {
  async createLabel(params: CreateLabelParams): Promise<CreateLabelResult> {
    try {
      const response = await fetch("https://panel.sendcloud.sc/api/v2/parcels", {
        method: "POST",
        headers: {
          "Authorization": getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parcel: {
            name: params.recipientAddress.name,
            company_name: params.recipientAddress.company || "",
            address: params.recipientAddress.street,
            house_number: params.recipientAddress.houseNumber,
            address_2: params.recipientAddress.houseNumberSuffix || "",
            city: params.recipientAddress.city,
            postal_code: params.recipientAddress.postalCode,
            country: params.recipientAddress.country,
            telephone: params.recipientAddress.phone || "",
            email: params.recipientAddress.email || "",
            weight: params.weight * 1000,
            request_label: true,
            shipment: {
              id: 8,
            },
          },
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.error?.message || "Failed to create Sendcloud parcel" }
      }

      const data = await response.json()
      const parcel = data.parcel

      return {
        success: true,
        trackingNumber: parcel?.tracking_number,
        trackingUrl: parcel?.tracking_url,
        labelUrl: parcel?.label?.label_printer,
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  async getTrackingInfo(trackingNumber: string): Promise<TrackingInfo> {
    const response = await fetch(`https://panel.sendcloud.sc/api/v2/tracking/${trackingNumber}`, {
      headers: {
        "Authorization": getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to get tracking info from Sendcloud")
    }

    const data = await response.json()

    return {
      status: data.parcel_status?.id?.toString() || "unknown",
      statusDescription: data.parcel_status?.message || "Unknown status",
      events: [],
      deliveredAt: data.parcel_status?.id === 11 ? new Date() : undefined,
    }
  },

  async cancelShipment(shipmentId: string): Promise<{ success: boolean }> {
    const response = await fetch(`https://panel.sendcloud.sc/api/v2/parcels/${shipmentId}/cancel`, {
      method: "POST",
      headers: {
        "Authorization": getAuthHeader(),
      },
    })

    return { success: response.ok }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sendcloud Service Points (Pickup Locations)
// ─────────────────────────────────────────────────────────────────────────────

export interface ServicePoint {
  id: number
  name: string
  street: string
  houseNumber: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
  carrier: string
  openingHours: Record<string, { open: string; close: string }[]>
}

export async function getServicePoints(postalCode: string, country: string = "NL"): Promise<ServicePoint[]> {
  const config = getConfig()

  const response = await fetch(
    `https://servicepoints.sendcloud.sc/api/v2/service-points?country=${country}&postal_code=${postalCode}`,
    {
      headers: {
        "Authorization": `Basic ${Buffer.from(`${config.publicKey}:${config.secretKey}`).toString("base64")}`,
      },
    }
  )

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data.service_points || []
}
