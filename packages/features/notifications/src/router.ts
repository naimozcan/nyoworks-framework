// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure, protectedProcedure } from "@nyoworks/api"
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
  NotificationsService,
  TemplatesService,
  PreferencesService,
  DevicesService,
} from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Send Router
// ─────────────────────────────────────────────────────────────────────────────

const sendRouter = router({
  email: tenantProcedure
    .input(sendEmailInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendEmail(input)
    }),

  sms: tenantProcedure
    .input(sendSmsInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendSms(input)
    }),

  push: tenantProcedure
    .input(sendPushInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendPush(input)
    }),

  inApp: tenantProcedure
    .input(sendInAppInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendInApp(input)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Templates Router
// ─────────────────────────────────────────────────────────────────────────────

const templatesRouter = router({
  create: tenantProcedure
    .input(createTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.create(input)
    }),

  update: tenantProcedure
    .input(updateTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const { templateId, ...updateData } = input
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.update(templateId, updateData)
    }),

  get: tenantProcedure
    .input(getTemplateInput)
    .query(async ({ input, ctx }) => {
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.get(input.templateId)
    }),

  list: tenantProcedure.query(async ({ ctx }) => {
    const service = new TemplatesService(ctx.db, ctx.tenantId)
    return service.list()
  }),

  delete: tenantProcedure
    .input(deleteTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.delete(input.templateId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notifications List Router
// ─────────────────────────────────────────────────────────────────────────────

const listRouter = router({
  all: tenantProcedure
    .input(listNotificationsInput)
    .query(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.listByUser(ctx.user.id, input)
    }),

  unreadCount: tenantProcedure.query(async ({ ctx }) => {
    const service = new NotificationsService(ctx.db, ctx.tenantId)
    return service.getUnreadCount(ctx.user.id, "in_app")
  }),

  markAsRead: tenantProcedure
    .input(markAsReadInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.markAsRead(input.notificationId, ctx.user.id)
    }),

  markAllAsRead: tenantProcedure
    .input(markAllAsReadInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.markAllAsRead(input.userId, "in_app")
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Preferences Router
// ─────────────────────────────────────────────────────────────────────────────

const preferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const service = new PreferencesService(ctx.db)
    return service.get(ctx.user.id)
  }),

  update: protectedProcedure
    .input(updatePreferencesInput)
    .mutation(async ({ input, ctx }) => {
      const service = new PreferencesService(ctx.db)
      return service.update(ctx.user.id, input)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Devices Router
// ─────────────────────────────────────────────────────────────────────────────

const devicesRouter = router({
  register: protectedProcedure
    .input(registerDeviceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new DevicesService(ctx.db)
      return service.register(ctx.user.id, input)
    }),

  unregister: protectedProcedure
    .input(unregisterDeviceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new DevicesService(ctx.db)
      return service.unregister(ctx.user.id, input.deviceToken)
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const service = new DevicesService(ctx.db)
    return service.list(ctx.user.id)
  }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsRouter = router({
  send: sendRouter,
  templates: templatesRouter,
  list: listRouter,
  preferences: preferencesRouter,
  devices: devicesRouter,
})

export type NotificationsRouter = typeof notificationsRouter
