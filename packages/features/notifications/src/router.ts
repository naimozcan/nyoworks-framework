// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, desc } from "drizzle-orm"
import {
  sendEmailInput,
  sendSmsInput,
  sendPushInput,
  sendInAppInput,
  createTemplateInput,
  updateTemplateInput,
  getTemplateInput,
  deleteTemplateInput,
  listNotificationsInput,
  markAsReadInput,
  markAllAsReadInput,
  updatePreferencesInput,
  registerDeviceInput,
  unregisterDeviceInput,
} from "./validators.js"
import {
  notifications,
  notificationTemplates,
  notificationPreferences,
  pushDevices,
  emailLogs,
} from "./schema.js"
import {
  sendEmailWithResend,
  sendSms,
  sendPushNotification,
  renderTemplate,
} from "./providers.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationsContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
    delete: (table: unknown) => unknown
  }
}

const t = initTRPC.context<NotificationsContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  })
})

const protectedProcedure = t.procedure.use(isAuthenticated)

// ─────────────────────────────────────────────────────────────────────────────
// Send Router
// ─────────────────────────────────────────────────────────────────────────────

const sendRouter = t.router({
  email: protectedProcedure
    .input(sendEmailInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      let body = input.body
      let htmlBody = input.htmlBody
      let subject = input.subject

      if (input.templateId && input.templateData) {
        const [template] = await db
          .select()
          .from(notificationTemplates)
          .where(eq(notificationTemplates.id, input.templateId))
          .limit(1)

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

      const [notification] = await db
        .insert(notifications)
        .values({
          tenantId: ctx.tenantId,
          channel: "email",
          status: input.scheduledFor ? "pending" : "pending",
          recipientEmail: input.to,
          subject,
          body,
          htmlBody,
          scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
          metadata: input.metadata,
        })
        .returning()

      if (!input.scheduledFor) {
        try {
          const result = await sendEmailWithResend({
            to: input.to,
            subject,
            text: body,
            html: htmlBody,
          })

          await db
            .update(notifications)
            .set({
              status: "sent",
              sentAt: new Date(),
            })
            .where(eq(notifications.id, notification.id))

          await db.insert(emailLogs).values({
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
          await db
            .update(notifications)
            .set({
              status: "failed",
              failedAt: new Date(),
              failureReason: error instanceof Error ? error.message : "Unknown error",
            })
            .where(eq(notifications.id, notification.id))

          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to send email" })
        }
      }

      return { success: true, notificationId: notification.id, scheduled: true }
    }),

  sms: protectedProcedure
    .input(sendSmsInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      let body = input.body

      if (input.templateId && input.templateData) {
        const [template] = await db
          .select()
          .from(notificationTemplates)
          .where(eq(notificationTemplates.id, input.templateId))
          .limit(1)

        if (template) {
          body = renderTemplate(template.body, input.templateData)
        }
      }

      const [notification] = await db
        .insert(notifications)
        .values({
          tenantId: ctx.tenantId,
          channel: "sms",
          status: "pending",
          recipientPhone: input.to,
          body,
          scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
          metadata: input.metadata,
        })
        .returning()

      if (!input.scheduledFor) {
        const result = await sendSms({ to: input.to, body })

        await db
          .update(notifications)
          .set({
            status: result.success ? "sent" : "failed",
            sentAt: result.success ? new Date() : null,
            failedAt: result.success ? null : new Date(),
            failureReason: result.error,
          })
          .where(eq(notifications.id, notification.id))

        if (!result.success) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error || "Failed to send SMS" })
        }
      }

      return { success: true, notificationId: notification.id }
    }),

  push: protectedProcedure
    .input(sendPushInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const devices = await db
        .select()
        .from(pushDevices)
        .where(and(eq(pushDevices.userId, input.userId), eq(pushDevices.isActive, true)))

      if (devices.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No active devices found for user" })
      }

      const results = await Promise.all(
        devices.map(async (device: { deviceToken: string }) => {
          const [notification] = await db
            .insert(notifications)
            .values({
              tenantId: ctx.tenantId,
              userId: input.userId,
              channel: "push",
              status: "pending",
              recipientDeviceToken: device.deviceToken,
              subject: input.title,
              body: input.body,
              data: input.data,
              scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
            })
            .returning()

          if (!input.scheduledFor) {
            const result = await sendPushNotification({
              token: device.deviceToken,
              title: input.title,
              body: input.body,
              data: input.data as Record<string, string>,
              imageUrl: input.imageUrl,
            })

            await db
              .update(notifications)
              .set({
                status: result.success ? "sent" : "failed",
                sentAt: result.success ? new Date() : null,
                failedAt: result.success ? null : new Date(),
                failureReason: result.error,
              })
              .where(eq(notifications.id, notification.id))

            return { deviceToken: device.deviceToken, success: result.success }
          }

          return { deviceToken: device.deviceToken, success: true, scheduled: true }
        })
      )

      return { success: true, results }
    }),

  inApp: protectedProcedure
    .input(sendInAppInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [notification] = await db
        .insert(notifications)
        .values({
          tenantId: ctx.tenantId,
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
        .returning()

      return { success: true, notificationId: notification.id }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Templates Router
// ─────────────────────────────────────────────────────────────────────────────

const templatesRouter = t.router({
  create: protectedProcedure
    .input(createTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [template] = await db
        .insert(notificationTemplates)
        .values({
          ...input,
          tenantId: ctx.tenantId,
        })
        .returning()

      return template
    }),

  update: protectedProcedure
    .input(updateTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const { templateId, ...updateData } = input
      const db = ctx.db as never

      const [template] = await db
        .update(notificationTemplates)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(notificationTemplates.id, templateId), eq(notificationTemplates.tenantId, ctx.tenantId)))
        .returning()

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      return template
    }),

  get: protectedProcedure
    .input(getTemplateInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(and(eq(notificationTemplates.id, input.templateId), eq(notificationTemplates.tenantId, ctx.tenantId)))
        .limit(1)

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      return template
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    return db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.tenantId, ctx.tenantId))
      .orderBy(desc(notificationTemplates.createdAt))
  }),

  delete: protectedProcedure
    .input(deleteTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(notificationTemplates)
        .where(and(eq(notificationTemplates.id, input.templateId), eq(notificationTemplates.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notifications List Router
// ─────────────────────────────────────────────────────────────────────────────

const listRouter = t.router({
  all: protectedProcedure
    .input(listNotificationsInput)
    .query(async ({ input, ctx }) => {
      const { limit, offset, channel, status } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user.id))

      if (channel) {
        query = query.where(eq(notifications.channel, channel))
      }

      if (status) {
        query = query.where(eq(notifications.status, status))
      }

      const items = await query
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.channel, "in_app"),
          eq(notifications.status, "delivered")
        )
      )

    return { count: result.length }
  }),

  markAsRead: protectedProcedure
    .input(markAsReadInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .update(notifications)
        .set({
          status: "read",
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.userId, ctx.user.id)
          )
        )

      return { success: true }
    }),

  markAllAsRead: protectedProcedure
    .input(markAllAsReadInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .update(notifications)
        .set({
          status: "read",
          readAt: new Date(),
        })
        .where(
          and(
            eq(notifications.userId, input.userId),
            eq(notifications.channel, "in_app"),
            eq(notifications.status, "delivered")
          )
        )

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Preferences Router
// ─────────────────────────────────────────────────────────────────────────────

const preferencesRouter = t.router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, ctx.user.id))
      .limit(1)

    if (!preferences) {
      const [newPreferences] = await db
        .insert(notificationPreferences)
        .values({ userId: ctx.user.id })
        .returning()

      return newPreferences
    }

    return preferences
  }),

  update: protectedProcedure
    .input(updatePreferencesInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const existing = await db
        .select()
        .from(notificationPreferences)
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .limit(1)

      if (existing.length === 0) {
        const [created] = await db
          .insert(notificationPreferences)
          .values({
            userId: ctx.user.id,
            ...input,
          })
          .returning()

        return created
      }

      const [updated] = await db
        .update(notificationPreferences)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreferences.userId, ctx.user.id))
        .returning()

      return updated
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Devices Router
// ─────────────────────────────────────────────────────────────────────────────

const devicesRouter = t.router({
  register: protectedProcedure
    .input(registerDeviceInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const existing = await db
        .select()
        .from(pushDevices)
        .where(eq(pushDevices.deviceToken, input.deviceToken))
        .limit(1)

      if (existing.length > 0) {
        const [updated] = await db
          .update(pushDevices)
          .set({
            userId: ctx.user.id,
            platform: input.platform,
            deviceName: input.deviceName,
            isActive: true,
            lastUsedAt: new Date(),
          })
          .where(eq(pushDevices.deviceToken, input.deviceToken))
          .returning()

        return updated
      }

      const [device] = await db
        .insert(pushDevices)
        .values({
          userId: ctx.user.id,
          deviceToken: input.deviceToken,
          platform: input.platform,
          deviceName: input.deviceName,
        })
        .returning()

      return device
    }),

  unregister: protectedProcedure
    .input(unregisterDeviceInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .update(pushDevices)
        .set({ isActive: false })
        .where(
          and(
            eq(pushDevices.deviceToken, input.deviceToken),
            eq(pushDevices.userId, ctx.user.id)
          )
        )

      return { success: true }
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as never

    return db
      .select()
      .from(pushDevices)
      .where(and(eq(pushDevices.userId, ctx.user.id), eq(pushDevices.isActive, true)))
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsRouter = t.router({
  send: sendRouter,
  templates: templatesRouter,
  list: listRouter,
  preferences: preferencesRouter,
  devices: devicesRouter,
})

export type NotificationsRouter = typeof notificationsRouter
