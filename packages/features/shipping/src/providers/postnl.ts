// ═══════════════════════════════════════════════════════════════════════════════
// PostNL Provider - Netherlands National Postal Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { ShippingProviderInterface, CreateLabelParams, CreateLabelResult, TrackingInfo } from "./types.js"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface PostNLConfig {
  apiKey: string
  customerCode: string
  customerNumber: string
  sandbox?: boolean
}

let postnlConfig: PostNLConfig | null = null

export function configurePostNL(config: PostNLConfig) {
  postnlConfig = config
}

function getConfig(): PostNLConfig {
  if (!postnlConfig) {
    const apiKey = process.env.POSTNL_API_KEY
    const customerCode = process.env.POSTNL_CUSTOMER_CODE
    const customerNumber = process.env.POSTNL_CUSTOMER_NUMBER

    if (!apiKey || !customerCode || !customerNumber) {
      throw new Error("PostNL not configured. Set POSTNL_API_KEY, POSTNL_CUSTOMER_CODE, POSTNL_CUSTOMER_NUMBER")
    }

    postnlConfig = {
      apiKey,
      customerCode,
      customerNumber,
      sandbox: process.env.NODE_ENV !== "production",
    }
  }
  return postnlConfig
}

function getBaseUrl(): string {
  const config = getConfig()
  return config.sandbox
    ? "https://api-sandbox.postnl.nl"
    : "https://api.postnl.nl"
}

// ─────────────────────────────────────────────────────────────────────────────
// PostNL Provider Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const postnlProvider: ShippingProviderInterface = {
  async createLabel(params: CreateLabelParams): Promise<CreateLabelResult> {
    const config = getConfig()
    const baseUrl = getBaseUrl()

    try {
      const response = await fetch(`${baseUrl}/shipment/v2_2/label`, {
        method: "POST",
        headers: {
          "apikey": config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Customer: {
            CustomerCode: config.customerCode,
            CustomerNumber: config.customerNumber,
          },
          Message: {
            MessageID: Date.now().toString(),
            MessageTimeStamp: new Date().toISOString(),
            Printertype: "GraphicFile|PDF",
          },
          Shipments: [{
            Addresses: [
              {
                AddressType: "01",
                City: params.recipientAddress.city,
                Countrycode: params.recipientAddress.country,
                HouseNr: params.recipientAddress.houseNumber,
                HouseNrExt: params.recipientAddress.houseNumberSuffix || "",
                Name: params.recipientAddress.name,
                Street: params.recipientAddress.street,
                Zipcode: params.recipientAddress.postalCode,
              },
              {
                AddressType: "02",
                City: params.senderAddress.city,
                Countrycode: params.senderAddress.country,
                HouseNr: params.senderAddress.houseNumber,
                HouseNrExt: params.senderAddress.houseNumberSuffix || "",
                Name: params.senderAddress.name,
                Street: params.senderAddress.street,
                Zipcode: params.senderAddress.postalCode,
              },
            ],
            Dimension: {
              Weight: Math.round(params.weight * 1000),
            },
            ProductCodeDelivery: "3085",
          }],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || "Failed to create PostNL label" }
      }

      const data = await response.json()
      const shipment = data.ResponseShipments?.[0]

      return {
        success: true,
        trackingNumber: shipment?.Barcode,
        trackingUrl: `https://postnl.nl/tracktrace/?B=${shipment?.Barcode}&P=${params.recipientAddress.postalCode}&D=NL&T=C`,
        labelUrl: shipment?.Labels?.[0]?.Content ? `data:application/pdf;base64,${shipment.Labels[0].Content}` : undefined,
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
    }
  },

  async getTrackingInfo(trackingNumber: string): Promise<TrackingInfo> {
    const config = getConfig()
    const baseUrl = getBaseUrl()

    const response = await fetch(`${baseUrl}/shipment/v2/status/barcode/${trackingNumber}`, {
      headers: {
        "apikey": config.apiKey,
      },
    })

    if (!response.ok) {
      throw new Error("Failed to get tracking info from PostNL")
    }

    const data = await response.json()
    const shipment = data.CurrentStatus?.Shipment

    return {
      status: shipment?.Status?.StatusCode || "unknown",
      statusDescription: shipment?.Status?.StatusDescription || "Unknown status",
      events: (shipment?.Events || []).map((event: Record<string, unknown>) => ({
        timestamp: new Date(event.TimeStamp as string),
        status: event.Code as string,
        description: event.Description as string,
        location: event.LocationDescription as string,
      })),
      deliveredAt: shipment?.Status?.StatusCode === "11" ? new Date(shipment.Status.TimeStamp) : undefined,
    }
  },

  async cancelShipment(_shipmentId: string): Promise<{ success: boolean }> {
    return { success: false }
  },
}
