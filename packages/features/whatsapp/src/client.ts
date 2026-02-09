// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Cloud API Client - Meta Business API
// ═══════════════════════════════════════════════════════════════════════════════

import type { TemplateComponent } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

interface WhatsAppConfig {
  accessToken: string
  phoneNumberId: string
  businessAccountId: string
  apiVersion?: string
}

let waConfig: WhatsAppConfig | null = null

export function configureWhatsApp(config: WhatsAppConfig) {
  waConfig = config
}

function getConfig(): WhatsAppConfig {
  if (!waConfig) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

    if (!accessToken || !phoneNumberId || !businessAccountId) {
      throw new Error("WhatsApp not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID")
    }

    waConfig = {
      accessToken,
      phoneNumberId,
      businessAccountId,
      apiVersion: process.env.WHATSAPP_API_VERSION || "v21.0",
    }
  }
  return waConfig
}

function getBaseUrl(): string {
  const config = getConfig()
  return `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Send Message
// ─────────────────────────────────────────────────────────────────────────────

export interface SendMessageResult {
  success: boolean
  messageId?: string
  error?: string
}

export async function sendTextMessage(to: string, text: string): Promise<SendMessageResult> {
  const config = getConfig()

  try {
    const response = await fetch(`${getBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: text },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || "Failed to send message" }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  language: string = "nl",
  components?: TemplateComponent[]
): Promise<SendMessageResult> {
  const config = getConfig()

  try {
    const response = await fetch(`${getBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || "Failed to send template message" }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendImageMessage(
  to: string,
  imageUrl: string,
  caption?: string
): Promise<SendMessageResult> {
  const config = getConfig()

  try {
    const response = await fetch(`${getBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "image",
        image: { link: imageUrl, caption },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || "Failed to send image" }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[],
  options?: { headerText?: string; footerText?: string }
): Promise<SendMessageResult> {
  const config = getConfig()

  try {
    const response = await fetch(`${getBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          header: options?.headerText ? { type: "text", text: options.headerText } : undefined,
          body: { text: bodyText },
          footer: options?.footerText ? { text: options.footerText } : undefined,
          action: {
            buttons: buttons.map(btn => ({
              type: "reply",
              reply: { id: btn.id, title: btn.title },
            })),
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.error?.message || "Failed to send interactive message" }
    }

    const data = await response.json()
    return { success: true, messageId: data.messages?.[0]?.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark as Read
// ─────────────────────────────────────────────────────────────────────────────

export async function markAsRead(messageId: string): Promise<boolean> {
  const config = getConfig()

  try {
    const response = await fetch(`${getBaseUrl()}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    })

    return response.ok
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Templates
// ─────────────────────────────────────────────────────────────────────────────

export interface WhatsAppTemplate {
  id: string
  name: string
  status: string
  category: string
  language: string
}

export async function getTemplates(): Promise<WhatsAppTemplate[]> {
  const config = getConfig()

  try {
    const response = await fetch(
      `https://graph.facebook.com/${config.apiVersion}/${config.businessAccountId}/message_templates`,
      {
        headers: {
          "Authorization": `Bearer ${config.accessToken}`,
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.data || []
  } catch {
    return []
  }
}
