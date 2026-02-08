// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Feature - Provider Clients
// ═══════════════════════════════════════════════════════════════════════════════

import { getEmailEnv, getSmsEnv, getPushEnv } from "@nyoworks/shared"
import { Resend } from "resend"

// ─────────────────────────────────────────────────────────────────────────────
// Resend (Email Provider)
// ─────────────────────────────────────────────────────────────────────────────

let resendClient: Resend | null = null

export function getResendClient(): Resend {
  if (!resendClient) {
    const emailEnv = getEmailEnv()
    const apiKey = emailEnv?.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set")
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

export interface SendEmailOptions {
  from?: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  replyTo?: string
  tags?: { name: string; value: string }[]
}

export async function sendEmailWithResend(options: SendEmailOptions) {
  const resend = getResendClient()
  const emailEnv = getEmailEnv()
  const fromEmail = options.from || emailEnv?.RESEND_FROM_EMAIL || "noreply@example.com"

  const baseOptions = {
    from: fromEmail,
    to: options.to,
    subject: options.subject,
    replyTo: options.replyTo,
    tags: options.tags,
  }

  if (options.html) {
    const result = await resend.emails.send({
      ...baseOptions,
      html: options.html,
    })
    return result
  }

  const result = await resend.emails.send({
    ...baseOptions,
    text: options.text || "",
  })
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS Provider (Twilio-compatible interface)
// ─────────────────────────────────────────────────────────────────────────────

export interface SendSmsOptions {
  to: string
  body: string
  from?: string
}

export async function sendSms(options: SendSmsOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const smsEnv = getSmsEnv()
  const accountSid = smsEnv?.TWILIO_ACCOUNT_SID
  const authToken = smsEnv?.TWILIO_AUTH_TOKEN
  const fromNumber = options.from || smsEnv?.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "SMS provider not configured" }
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: options.to,
          From: fromNumber,
          Body: options.body,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || "Failed to send SMS" }
    }

    const data = await response.json()
    return { success: true, messageId: data.sid }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Push Notification Provider (FCM-compatible interface)
// ─────────────────────────────────────────────────────────────────────────────

export interface PushNotificationPayload {
  token: string
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const pushEnv = getPushEnv()
  const fcmServerKey = pushEnv?.FCM_SERVER_KEY

  if (!fcmServerKey) {
    return { success: false, error: "FCM not configured" }
  }

  try {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Authorization": `key=${fcmServerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: payload.token,
        notification: {
          title: payload.title,
          body: payload.body,
          image: payload.imageUrl,
        },
        data: payload.data,
      }),
    })

    if (!response.ok) {
      return { success: false, error: "Failed to send push notification" }
    }

    const data = await response.json()

    if (data.success === 1) {
      return { success: true, messageId: data.results[0]?.message_id }
    } else {
      return { success: false, error: data.results[0]?.error || "Unknown error" }
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Rendering
// ─────────────────────────────────────────────────────────────────────────────

export function renderTemplate(template: string, data: Record<string, unknown>): string {
  let result = template

  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g")
    result = result.replace(regex, String(value ?? ""))
  }

  return result
}

export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{\s*(\w+)\s*\}\}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(template)) !== null) {
    const variable = match[1]
    if (variable && !variables.includes(variable)) {
      variables.push(variable)
    }
  }

  return variables
}
