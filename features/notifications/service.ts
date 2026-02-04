// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Service
// ═══════════════════════════════════════════════════════════════════════════════

import { db, eq, and, desc } from "../../core/database/client"
import { notifications, notificationTemplates, notificationPreferences } from "./schema"
import { createLogger } from "../../core/shared/logger"
import type { Notification, NewNotification, NotificationTemplate } from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const logger = createLogger("notifications-service")

// ─────────────────────────────────────────────────────────────────────────────
// Send Notification
// ─────────────────────────────────────────────────────────────────────────────

async function send(
  tenantId: string,
  userId: string,
  data: {
    type: string
    channel: string
    title: string
    body?: string
    data?: Record<string, unknown>
  }
): Promise<Notification> {
  const preference = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.channel, data.channel),
      eq(notificationPreferences.type, data.type)
    ),
  })

  if (preference && !preference.enabled) {
    logger.info({ userId, type: data.type, channel: data.channel }, "Notification disabled by user preference")
    throw new Error("Notification disabled by user preference")
  }

  const [notification] = await db
    .insert(notifications)
    .values({
      tenantId,
      userId,
      type: data.type,
      channel: data.channel,
      title: data.title,
      body: data.body,
      data: data.data,
      sentAt: new Date(),
    })
    .returning()

  await dispatchToChannel(notification)

  logger.info({ notificationId: notification.id }, "Notification sent")
  return notification
}

async function dispatchToChannel(notification: Notification): Promise<void> {
  switch (notification.channel) {
    case "email":
      await sendEmail(notification)
      break
    case "push":
      await sendPush(notification)
      break
    case "sms":
      await sendSms(notification)
      break
    case "in_app":
      break
  }
}

async function sendEmail(notification: Notification): Promise<void> {
  logger.info({ notificationId: notification.id }, "Sending email notification")
}

async function sendPush(notification: Notification): Promise<void> {
  logger.info({ notificationId: notification.id }, "Sending push notification")
}

async function sendSms(notification: Notification): Promise<void> {
  logger.info({ notificationId: notification.id }, "Sending SMS notification")
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Notifications
// ─────────────────────────────────────────────────────────────────────────────

async function getByUser(
  tenantId: string,
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  const { limit = 20, offset = 0, unreadOnly = false } = options

  const conditions = [
    eq(notifications.tenantId, tenantId),
    eq(notifications.userId, userId),
  ]

  if (unreadOnly) {
    conditions.push(eq(notifications.isRead, false))
  }

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset)
}

async function getUnreadCount(tenantId: string, userId: string): Promise<number> {
  const result = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    )

  return result.length
}

// ─────────────────────────────────────────────────────────────────────────────
// Mark as Read
// ─────────────────────────────────────────────────────────────────────────────

async function markAsRead(
  tenantId: string,
  userId: string,
  notificationId: string
): Promise<Notification | null> {
  const [updated] = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId)
      )
    )
    .returning()

  return updated ?? null
}

async function markAllAsRead(tenantId: string, userId: string): Promise<number> {
  const result = await db
    .update(notifications)
    .set({
      isRead: true,
      readAt: new Date(),
    })
    .where(
      and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      )
    )
    .returning()

  return result.length
}

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

async function getTemplate(
  tenantId: string | null,
  slug: string,
  channel: string,
  locale: string = "en"
): Promise<NotificationTemplate | null> {
  const template = await db.query.notificationTemplates.findFirst({
    where: and(
      tenantId ? eq(notificationTemplates.tenantId, tenantId) : undefined,
      eq(notificationTemplates.slug, slug),
      eq(notificationTemplates.channel, channel),
      eq(notificationTemplates.locale, locale)
    ),
  })

  return template ?? null
}

function renderTemplate(
  template: NotificationTemplate,
  variables: Record<string, string>
): { subject: string | null; body: string } {
  let subject = template.subject
  let body = template.body

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    if (subject) {
      subject = subject.replace(new RegExp(placeholder, "g"), value)
    }
    body = body.replace(new RegExp(placeholder, "g"), value)
  }

  return { subject, body }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsService = {
  send,
  getByUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getTemplate,
  renderTemplate,
}
