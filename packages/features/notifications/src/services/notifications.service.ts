// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Service
// ═══════════════════════════════════════════════════════════════════════════════

import { TRPCError } from "@trpc/server"
import {
  NotificationsRepository,
  TemplatesRepository,
  DevicesRepository,
  EmailLogsRepository,
} from "../repositories/index.js"
import {
  sendEmailWithResend,
  sendSms,
  sendPushNotification,
  renderTemplate,
} from "../providers.js"
import { notifications } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type NotificationChannel = typeof notifications.$inferSelect["channel"]
type NotificationStatus = typeof notifications.$inferSelect["status"]

interface SendEmailInput {
  to: string
  subject: string
  body: string
  htmlBody?: string
  templateId?: string
  templateData?: Record<string, unknown>
  scheduledFor?: string
  metadata?: Record<string, unknown>
}

interface SendSmsInput {
  to: string
  body: string
  templateId?: string
  templateData?: Record<string, unknown>
  scheduledFor?: string
  metadata?: Record<string, unknown>
}

interface SendPushInput {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
  imageUrl?: string
  scheduledFor?: string
}

interface SendInAppInput {
  userId: string
  title: string
  body: string
  type?: string
  actionUrl?: string
  actionLabel?: string
  data?: Record<string, unknown>
}

interface ListInput {
  limit: number
  offset: number
  channel?: NotificationChannel
  status?: NotificationStatus
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class NotificationsService {
  private readonly notificationsRepo: NotificationsRepository
  private readonly templatesRepo: TemplatesRepository
  private readonly devicesRepo: DevicesRepository
  private readonly emailLogsRepo: EmailLogsRepository

  constructor(db: unknown, tenantId: string) {
    this.notificationsRepo = new NotificationsRepository(db, tenantId)
    this.templatesRepo = new TemplatesRepository(db, tenantId)
    this.devicesRepo = new DevicesRepository(db)
    this.emailLogsRepo = new EmailLogsRepository(db)
  }

  async sendEmail(input: SendEmailInput) {
    let body = input.body
    let htmlBody = input.htmlBody
    let subject = input.subject

    if (input.templateId && input.templateData) {
      const template = await this.templatesRepo.findById(input.templateId)
      if (template) {
        body = renderTemplate(template.body, input.templateData)
        if (template.htmlBody) {
          htmlBody = renderTemplate(template.htmlBody, input.templateData)
        }
        if (template.subject) {
          subject = renderTemplate(template.subject, input.templateData)
        }
      }
    }

    const notification = await this.notificationsRepo.create({
      channel: "email",
      status: input.scheduledFor ? "pending" : "pending",
      recipientEmail: input.to,
      subject,
      body,
      htmlBody,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      metadata: input.metadata,
    })

    if (!input.scheduledFor) {
      try {
        const result = await sendEmailWithResend({
          to: input.to,
          subject,
          text: body,
          html: htmlBody,
        })

        await this.notificationsRepo.update(notification.id, {
          status: "sent",
          sentAt: new Date(),
        })

        await this.emailLogsRepo.create({
          notificationId: notification.id,
          provider: "resend",
          providerId: result.data?.id,
          fromEmail: process.env.RESEND_FROM_EMAIL || "noreply@example.com",
          toEmail: input.to,
          subject,
          status: "sent",
        })

        return { success: true, notificationId: notification.id }
      } catch (error) {
        await this.notificationsRepo.update(notification.id, {
          status: "failed",
          failedAt: new Date(),
          failureReason: error instanceof Error ? error.message : "Unknown error",
        })

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send email" })
      }
    }

    return { success: true, notificationId: notification.id, scheduled: true }
  }

  async sendSms(input: SendSmsInput) {
    let body = input.body

    if (input.templateId && input.templateData) {
      const template = await this.templatesRepo.findById(input.templateId)
      if (template) {
        body = renderTemplate(template.body, input.templateData)
      }
    }

    const notification = await this.notificationsRepo.create({
      channel: "sms",
      status: "pending",
      recipientPhone: input.to,
      body,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      metadata: input.metadata,
    })

    if (!input.scheduledFor) {
      const result = await sendSms({ to: input.to, body })

      await this.notificationsRepo.update(notification.id, {
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : undefined,
        failedAt: result.success ? undefined : new Date(),
        failureReason: result.error,
      })

      if (!result.success) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Failed to send SMS" })
      }
    }

    return { success: true, notificationId: notification.id }
  }

  async sendPush(input: SendPushInput) {
    const devices = await this.devicesRepo.findByUserId(input.userId, true)

    if (devices.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "No active devices found for user" })
    }

    const results = await Promise.all(
      devices.map(async (device) => {
        const notification = await this.notificationsRepo.create({
          userId: input.userId,
          channel: "push",
          status: "pending",
          recipientDeviceToken: device.deviceToken,
          subject: input.title,
          body: input.body,
          data: input.data,
          scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        })

        if (!input.scheduledFor) {
          const result = await sendPushNotification({
            token: device.deviceToken,
            title: input.title,
            body: input.body,
            data: input.data as Record<string, string>,
            imageUrl: input.imageUrl,
          })

          await this.notificationsRepo.update(notification.id, {
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : undefined,
            failedAt: result.success ? undefined : new Date(),
            failureReason: result.error,
          })

          return { deviceToken: device.deviceToken, success: result.success }
        }

        return { deviceToken: device.deviceToken, success: true, scheduled: true }
      })
    )

    return { success: true, results }
  }

  async sendInApp(input: SendInAppInput) {
    const notification = await this.notificationsRepo.create({
      userId: input.userId,
      channel: "in_app",
      status: "delivered",
      subject: input.title,
      body: input.body,
      data: {
        type: input.type,
        actionUrl: input.actionUrl,
        actionLabel: input.actionLabel,
        ...input.data,
      },
      deliveredAt: new Date(),
    })

    return { success: true, notificationId: notification.id }
  }

  async listByUser(userId: string, options: ListInput) {
    const items = await this.notificationsRepo.listByUser(userId, options)
    return { items }
  }

  async getUnreadCount(userId: string, channel?: NotificationChannel) {
    const count = await this.notificationsRepo.countUnread(userId, channel)
    return { count }
  }

  async markAsRead(notificationId: string, userId: string) {
    const success = await this.notificationsRepo.markAsRead(notificationId, userId)
    return { success }
  }

  async markAllAsRead(userId: string, channel?: NotificationChannel) {
    const count = await this.notificationsRepo.markAllAsRead(userId, channel)
    return { success: true, count }
  }
}
