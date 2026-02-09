// ═══════════════════════════════════════════════════════════════════════════════
// Storecove Provider - Peppol Access Point
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface StorecoveConfig {
  apiKey: string
  legalEntityId: string
}

let storecoveConfig: StorecoveConfig | null = null

export function configureStorecove(config: StorecoveConfig) {
  storecoveConfig = config
}

function getConfig(): StorecoveConfig {
  if (!storecoveConfig) {
    const apiKey = process.env.STORECOVE_API_KEY
    const legalEntityId = process.env.STORECOVE_LEGAL_ENTITY_ID

    if (!apiKey || !legalEntityId) {
      throw new Error("Storecove not configured. Set STORECOVE_API_KEY and STORECOVE_LEGAL_ENTITY_ID")
    }

    storecoveConfig = { apiKey, legalEntityId }
  }
  return storecoveConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Document
// ─────────────────────────────────────────────────────────────────────────────

export interface StorecoveRecipient {
  identifier: string
  scheme: "NL:VAT" | "NL:KVK" | "GLN"
}

export interface SendDocumentParams {
  recipient: StorecoveRecipient
  document: string
  documentType: "invoice" | "credit_note"
}

export interface SendDocumentResult {
  success: boolean
  guid?: string
  error?: string
}

export async function sendStorecoveDocument(params: SendDocumentParams): Promise<SendDocumentResult> {
  const config = getConfig()

  try {
    const response = await fetch("https://api.storecove.com/api/v2/document_submissions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        legalEntityId: config.legalEntityId,
        routing: {
          eIdentifiers: [{
            scheme: params.recipient.scheme,
            id: params.recipient.identifier,
          }],
        },
        document: {
          documentType: params.documentType === "invoice" ? "invoice" : "creditnote",
          rawDocumentData: {
            document: Buffer.from(params.document).toString("base64"),
            parseStrategy: "ubl",
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || "Failed to send document via Storecove" }
    }

    const data = await response.json()
    return {
      success: true,
      guid: data.guid,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check Delivery Status
// ─────────────────────────────────────────────────────────────────────────────

export async function checkDeliveryStatus(guid: string): Promise<{ status: string; deliveredAt?: Date }> {
  const config = getConfig()

  const response = await fetch(`https://api.storecove.com/api/v2/document_submissions/${guid}`, {
    headers: {
      "Authorization": `Bearer ${config.apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to check delivery status")
  }

  const data = await response.json()
  return {
    status: data.status,
    deliveredAt: data.deliveredAt ? new Date(data.deliveredAt) : undefined,
  }
}
