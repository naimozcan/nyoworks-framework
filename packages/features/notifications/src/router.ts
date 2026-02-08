// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
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
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationsContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: unknown
}

const t = initTRPC.context<NotificationsContext>().create()

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  if (!ctx.tenantId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant ID required" })
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      tenantId: ctx.tenantId,
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
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendEmail(input)
    }),

  sms: protectedProcedure
    .input(sendSmsInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendSms(input)
    }),

  push: protectedProcedure
    .input(sendPushInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendPush(input)
    }),

  inApp: protectedProcedure
    .input(sendInAppInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.sendInApp(input)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Templates Router
// ─────────────────────────────────────────────────────────────────────────────

const templatesRouter = t.router({
  create: protectedProcedure
    .input(createTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.create(input)
    }),

  update: protectedProcedure
    .input(updateTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const { templateId, ...updateData } = input
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.update(templateId, updateData)
    }),

  get: protectedProcedure
    .input(getTemplateInput)
    .query(async ({ input, ctx }) => {
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.get(input.templateId)
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const service = new TemplatesService(ctx.db, ctx.tenantId)
    return service.list()
  }),

  delete: protectedProcedure
    .input(deleteTemplateInput)
    .mutation(async ({ input, ctx }) => {
      const service = new TemplatesService(ctx.db, ctx.tenantId)
      return service.delete(input.templateId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Notifications List Router
// ─────────────────────────────────────────────────────────────────────────────

const listRouter = t.router({
  all: protectedProcedure
    .input(listNotificationsInput)
    .query(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.listByUser(ctx.user.id, input)
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const service = new NotificationsService(ctx.db, ctx.tenantId)
    return service.getUnreadCount(ctx.user.id, "in_app")
  }),

  markAsRead: protectedProcedure
    .input(markAsReadInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.markAsRead(input.notificationId, ctx.user.id)
    }),

  markAllAsRead: protectedProcedure
    .input(markAllAsReadInput)
    .mutation(async ({ input, ctx }) => {
      const service = new NotificationsService(ctx.db, ctx.tenantId)
      return service.markAllAsRead(input.userId, "in_app")
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Preferences Router
// ─────────────────────────────────────────────────────────────────────────────

const preferencesRouter = t.router({
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

const devicesRouter = t.router({
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

export const notificationsRouter = t.router({
  send: sendRouter,
  templates: templatesRouter,
  list: listRouter,
  preferences: preferencesRouter,
  devices: devicesRouter,
})

export type NotificationsRouter = typeof notificationsRouter
