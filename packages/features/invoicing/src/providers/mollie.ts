// ═══════════════════════════════════════════════════════════════════════════════
// Mollie Invoicing Provider - Peppol E-Invoicing via Mollie
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface MollieInvoicingConfig {
  apiKey: string
  testMode?: boolean
}

let mollieConfig: MollieInvoicingConfig | null = null

export function configureMollieInvoicing(config: MollieInvoicingConfig) {
  mollieConfig = config
}

function getConfig(): MollieInvoicingConfig {
  if (!mollieConfig) {
    const apiKey = process.env.MOLLIE_API_KEY

    if (!apiKey) {
      throw new Error("Mollie not configured. Set MOLLIE_API_KEY")
    }

    mollieConfig = {
      apiKey,
      testMode: process.env.NODE_ENV !== "production",
    }
  }
  return mollieConfig
}

// ─────────────────────────────────────────────────────────────────────────────
// Peppol Registration Check
// ─────────────────────────────────────────────────────────────────────────────

export interface PeppolParticipant {
  peppolId: string
  companyName: string
  country: string
  documentTypes: string[]
}

export async function checkPeppolRegistration(vatNumber: string): Promise<PeppolParticipant | null> {
  const config = getConfig()

  try {
    const response = await fetch(`https://api.mollie.com/v2/peppol/participants/${vatNumber}`, {
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
      },
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      peppolId: data.peppolId,
      companyName: data.companyName,
      country: data.country,
      documentTypes: data.documentTypes || [],
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Invoice via Peppol
// ─────────────────────────────────────────────────────────────────────────────

export interface SendPeppolInvoiceParams {
  recipientPeppolId: string
  ublXml: string
}

export interface SendPeppolInvoiceResult {
  success: boolean
  peppolMessageId?: string
  error?: string
}

export async function sendPeppolInvoice(params: SendPeppolInvoiceParams): Promise<SendPeppolInvoiceResult> {
  const config = getConfig()

  try {
    const response = await fetch("https://api.mollie.com/v2/peppol/invoices", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientId: params.recipientPeppolId,
        document: params.ublXml,
        documentType: "invoice",
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.detail || "Failed to send Peppol invoice" }
    }

    const data = await response.json()
    return {
      success: true,
      peppolMessageId: data.id,
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
