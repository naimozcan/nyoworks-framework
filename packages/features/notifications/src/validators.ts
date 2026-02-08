// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Common Types
// ─────────────────────────────────────────────────────────────────────────────

export const notificationChannel = z.enum(["email", "sms", "push", "in_app"])
export const notificationStatus = z.enum(["pending", "sent", "delivered", "failed", "read"])

// ─────────────────────────────────────────────────────────────────────────────
// Send Notification Validators
// ─────────────────────────────────────────────────────────────────────────────

export const sendEmailInput = z.object({
  to: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  templateId: z.string().uuid().optional(),
  templateData: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const sendSmsInput = z.object({
  to: z.string().min(10).max(15),
  body: z.string().min(1).max(1600),
  templateId: z.string().uuid().optional(),
  templateData: z.record(z.unknown()).optional(),
  scheduledFor: z.string().datetime().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const sendPushInput = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.record(z.unknown()).optional(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
})

export const sendInAppInput = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  type: z.enum(["info", "success", "warning", "error"]).default("info"),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  data: z.record(z.unknown()).optional(),
})

export const sendBulkEmailInput = z.object({
  recipients: z.array(z.object({
    email: z.string().email(),
    data: z.record(z.unknown()).optional(),
  })).min(1).max(1000),
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  templateId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Template Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createTemplateInput = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  channel: notificationChannel,
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  variables: z.array(z.string()).optional(),
})

export const updateTemplateInput = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).optional(),
  htmlBody: z.string().optional(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export const getTemplateInput = z.object({
  templateId: z.string().uuid(),
})

export const getTemplateBySlugInput = z.object({
  slug: z.string(),
  channel: notificationChannel,
})

export const deleteTemplateInput = z.object({
  templateId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notification List Validators
// ─────────────────────────────────────────────────────────────────────────────

export const listNotificationsInput = z.object({
  userId: z.string().uuid().optional(),
  channel: notificationChannel.optional(),
  status: notificationStatus.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

export const getNotificationInput = z.object({
  notificationId: z.string().uuid(),
})

export const markAsReadInput = z.object({
  notificationId: z.string().uuid(),
})

export const markAllAsReadInput = z.object({
  userId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Preference Validators
// ─────────────────────────────────────────────────────────────────────────────

export const getPreferencesInput = z.object({
  userId: z.string().uuid(),
})

export const updatePreferencesInput = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  marketingEmails: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
  securityAlerts: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timezone: z.string().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Push Device Validators
// ─────────────────────────────────────────────────────────────────────────────

export const registerDeviceInput = z.object({
  deviceToken: z.string().min(1),
  platform: z.enum(["ios", "android", "web"]),
  deviceName: z.string().max(100).optional(),
})

export const unregisterDeviceInput = z.object({
  deviceToken: z.string().min(1),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type NotificationChannel = z.infer<typeof notificationChannel>
export type NotificationStatus = z.infer<typeof notificationStatus>

export type SendEmailInput = z.infer<typeof sendEmailInput>
export type SendSmsInput = z.infer<typeof sendSmsInput>
export type SendPushInput = z.infer<typeof sendPushInput>
export type SendInAppInput = z.infer<typeof sendInAppInput>
export type SendBulkEmailInput = z.infer<typeof sendBulkEmailInput>

export type CreateTemplateInput = z.infer<typeof createTemplateInput>
export type UpdateTemplateInput = z.infer<typeof updateTemplateInput>
export type GetTemplateInput = z.infer<typeof getTemplateInput>
export type GetTemplateBySlugInput = z.infer<typeof getTemplateBySlugInput>
export type DeleteTemplateInput = z.infer<typeof deleteTemplateInput>

export type ListNotificationsInput = z.infer<typeof listNotificationsInput>
export type GetNotificationInput = z.infer<typeof getNotificationInput>
export type MarkAsReadInput = z.infer<typeof markAsReadInput>
export type MarkAllAsReadInput = z.infer<typeof markAllAsReadInput>

export type GetPreferencesInput = z.infer<typeof getPreferencesInput>
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesInput>

export type RegisterDeviceInput = z.infer<typeof registerDeviceInput>
export type UnregisterDeviceInput = z.infer<typeof unregisterDeviceInput>
