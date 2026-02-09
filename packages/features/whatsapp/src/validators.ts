// ═══════════════════════════════════════════════════════════════════════════════
// WhatsApp Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Phone Number Validator (E.164 format)
// ─────────────────────────────────────────────────────────────────────────────

export const phoneNumberSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format (E.164)")
  .transform(phone => phone.startsWith("+") ? phone : `+${phone}`)

// ─────────────────────────────────────────────────────────────────────────────
// Message Content Validators
// ─────────────────────────────────────────────────────────────────────────────

export const templateParameterSchema = z.object({
  type: z.enum(["text", "currency", "date_time", "image", "document"]),
  text: z.string().optional(),
  currency: z.object({
    fallback_value: z.string(),
    code: z.string().length(3),
    amount_1000: z.number(),
  }).optional(),
  date_time: z.object({
    fallback_value: z.string(),
  }).optional(),
  image: z.object({
    link: z.string().url(),
  }).optional(),
  document: z.object({
    link: z.string().url(),
  }).optional(),
})

export const templateComponentSchema = z.object({
  type: z.enum(["header", "body", "button"]),
  parameters: z.array(templateParameterSchema),
})

// ─────────────────────────────────────────────────────────────────────────────
// Send Message Validators
// ─────────────────────────────────────────────────────────────────────────────

export const sendTextMessageSchema = z.object({
  to: phoneNumberSchema,
  text: z.string().min(1).max(4096),
})

export const sendTemplateMessageSchema = z.object({
  to: phoneNumberSchema,
  templateName: z.string().min(1),
  templateLanguage: z.string().default("nl"),
  components: z.array(templateComponentSchema).optional(),
})

export const sendImageMessageSchema = z.object({
  to: phoneNumberSchema,
  imageUrl: z.string().url(),
  caption: z.string().max(1024).optional(),
})

export const sendDocumentMessageSchema = z.object({
  to: phoneNumberSchema,
  documentUrl: z.string().url(),
  filename: z.string(),
  caption: z.string().max(1024).optional(),
})

export const sendInteractiveButtonsSchema = z.object({
  to: phoneNumberSchema,
  bodyText: z.string().min(1).max(1024),
  headerText: z.string().max(60).optional(),
  footerText: z.string().max(60).optional(),
  buttons: z.array(z.object({
    id: z.string().max(256),
    title: z.string().max(20),
  })).min(1).max(3),
})

export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>
export type SendTemplateMessageInput = z.infer<typeof sendTemplateMessageSchema>
export type SendImageMessageInput = z.infer<typeof sendImageMessageSchema>
export type SendDocumentMessageInput = z.infer<typeof sendDocumentMessageSchema>
export type SendInteractiveButtonsInput = z.infer<typeof sendInteractiveButtonsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Netherlands Phone Number Helper
// ─────────────────────────────────────────────────────────────────────────────

export function formatNLPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "")

  if (cleaned.startsWith("31")) {
    return `+${cleaned}`
  }

  if (cleaned.startsWith("0")) {
    return `+31${cleaned.slice(1)}`
  }

  if (cleaned.startsWith("6") && cleaned.length === 9) {
    return `+31${cleaned}`
  }

  return `+${cleaned}`
}
