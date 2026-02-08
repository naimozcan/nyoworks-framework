// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import {
  createAppointmentInput,
  updateAppointmentInput,
  getAppointmentInput,
  deleteAppointmentInput,
  listAppointmentsInput,
  cancelAppointmentInput,
  confirmAppointmentInput,
  completeAppointmentInput,
  createServiceInput,
  updateServiceInput,
  getServiceInput,
  deleteServiceInput,
  listServicesInput,
  createProviderInput,
  updateProviderInput,
  getProviderInput,
  deleteProviderInput,
  listProvidersInput,
  addServiceToProviderInput,
  removeServiceFromProviderInput,
  setAvailabilityInput,
  updateAvailabilityInput,
  deleteAvailabilityInput,
  getProviderAvailabilityInput,
  checkAvailabilityInput,
  getAvailableSlotsInput,
} from "./validators.js"
import { AppointmentsService } from "./services/index.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface AppointmentsContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: unknown
}

const t = initTRPC.context<AppointmentsContext>().create()

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
// Services Router
// ─────────────────────────────────────────────────────────────────────────────

const servicesRouter = t.router({
  create: protectedProcedure
    .input(createServiceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.createService(input)
    }),

  update: protectedProcedure
    .input(updateServiceInput)
    .mutation(async ({ input, ctx }) => {
      const { serviceId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateService(serviceId, updateData)
    }),

  get: protectedProcedure
    .input(getServiceInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getService(input.serviceId)
    }),

  list: protectedProcedure
    .input(listServicesInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listServices(input)
    }),

  delete: protectedProcedure
    .input(deleteServiceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteService(input.serviceId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Providers Router
// ─────────────────────────────────────────────────────────────────────────────

const providersRouter = t.router({
  create: protectedProcedure
    .input(createProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.createProvider(input)
    }),

  update: protectedProcedure
    .input(updateProviderInput)
    .mutation(async ({ input, ctx }) => {
      const { providerId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateProvider(providerId, updateData)
    }),

  get: protectedProcedure
    .input(getProviderInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getProvider(input.providerId)
    }),

  list: protectedProcedure
    .input(listProvidersInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listProviders(input)
    }),

  delete: protectedProcedure
    .input(deleteProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteProvider(input.providerId)
    }),

  addService: protectedProcedure
    .input(addServiceToProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.addServiceToProvider(input.providerId, input.serviceId)
    }),

  removeService: protectedProcedure
    .input(removeServiceFromProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.removeServiceFromProvider(input.providerId, input.serviceId)
    }),

  getServices: protectedProcedure
    .input(getProviderInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getProviderServices(input.providerId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Availability Router
// ─────────────────────────────────────────────────────────────────────────────

const availabilityRouter = t.router({
  set: protectedProcedure
    .input(setAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.setAvailability(input)
    }),

  update: protectedProcedure
    .input(updateAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const { availabilityId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateAvailability(availabilityId, updateData)
    }),

  delete: protectedProcedure
    .input(deleteAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteAvailability(input.availabilityId)
    }),

  getForProvider: protectedProcedure
    .input(getProviderAvailabilityInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getProviderAvailability(input.providerId)
    }),

  checkSlots: protectedProcedure
    .input(checkAvailabilityInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.checkAvailability(input)
    }),

  getSlots: protectedProcedure
    .input(getAvailableSlotsInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getAvailableSlots(input)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Appointments Router
// ─────────────────────────────────────────────────────────────────────────────

const appointmentsSubRouter = t.router({
  create: protectedProcedure
    .input(createAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.createAppointment({
        ...input,
        userId: ctx.user.id,
      })
    }),

  update: protectedProcedure
    .input(updateAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const { appointmentId, serviceId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateAppointment(appointmentId, { ...updateData, serviceId }, serviceId)
    }),

  get: protectedProcedure
    .input(getAppointmentInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getAppointment(input.appointmentId)
    }),

  list: protectedProcedure
    .input(listAppointmentsInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listAppointments(input)
    }),

  delete: protectedProcedure
    .input(deleteAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteAppointment(input.appointmentId)
    }),

  cancel: protectedProcedure
    .input(cancelAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.cancelAppointment(input.appointmentId, input.reason)
    }),

  confirm: protectedProcedure
    .input(confirmAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.confirmAppointment(input.appointmentId)
    }),

  complete: protectedProcedure
    .input(completeAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.completeAppointment(input.appointmentId, input.notes)
    }),

  myAppointments: protectedProcedure
    .input(listAppointmentsInput.omit({ providerId: true }))
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listMyAppointments(ctx.user.id, input)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentsRouter = t.router({
  appointments: appointmentsSubRouter,
  services: servicesRouter,
  providers: providersRouter,
  availability: availabilityRouter,
})

export type AppointmentsRouter = typeof appointmentsRouter
