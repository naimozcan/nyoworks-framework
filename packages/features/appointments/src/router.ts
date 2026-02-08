// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { router, tenantProcedure } from "@nyoworks/api"
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
// Services Router
// ─────────────────────────────────────────────────────────────────────────────

const servicesRouter = router({
  create: tenantProcedure
    .input(createServiceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.createService(input)
    }),

  update: tenantProcedure
    .input(updateServiceInput)
    .mutation(async ({ input, ctx }) => {
      const { serviceId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateService(serviceId, updateData)
    }),

  get: tenantProcedure
    .input(getServiceInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getService(input.serviceId)
    }),

  list: tenantProcedure
    .input(listServicesInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listServices(input)
    }),

  delete: tenantProcedure
    .input(deleteServiceInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteService(input.serviceId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Providers Router
// ─────────────────────────────────────────────────────────────────────────────

const providersRouter = router({
  create: tenantProcedure
    .input(createProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.createProvider(input)
    }),

  update: tenantProcedure
    .input(updateProviderInput)
    .mutation(async ({ input, ctx }) => {
      const { providerId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateProvider(providerId, updateData)
    }),

  get: tenantProcedure
    .input(getProviderInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getProvider(input.providerId)
    }),

  list: tenantProcedure
    .input(listProvidersInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listProviders(input)
    }),

  delete: tenantProcedure
    .input(deleteProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteProvider(input.providerId)
    }),

  addService: tenantProcedure
    .input(addServiceToProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.addServiceToProvider(input.providerId, input.serviceId)
    }),

  removeService: tenantProcedure
    .input(removeServiceFromProviderInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.removeServiceFromProvider(input.providerId, input.serviceId)
    }),

  getServices: tenantProcedure
    .input(getProviderInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getProviderServices(input.providerId)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Availability Router
// ─────────────────────────────────────────────────────────────────────────────

const availabilityRouter = router({
  set: tenantProcedure
    .input(setAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.setAvailability(input)
    }),

  update: tenantProcedure
    .input(updateAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const { availabilityId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateAvailability(availabilityId, updateData)
    }),

  delete: tenantProcedure
    .input(deleteAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteAvailability(input.availabilityId)
    }),

  getForProvider: tenantProcedure
    .input(getProviderAvailabilityInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getProviderAvailability(input.providerId)
    }),

  checkSlots: tenantProcedure
    .input(checkAvailabilityInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.checkAvailability(input)
    }),

  getSlots: tenantProcedure
    .input(getAvailableSlotsInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getAvailableSlots(input)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Appointments Router
// ─────────────────────────────────────────────────────────────────────────────

const appointmentsSubRouter = router({
  create: tenantProcedure
    .input(createAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.createAppointment({
        ...input,
        userId: ctx.user.id,
      })
    }),

  update: tenantProcedure
    .input(updateAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const { appointmentId, serviceId, ...updateData } = input
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.updateAppointment(appointmentId, { ...updateData, serviceId }, serviceId)
    }),

  get: tenantProcedure
    .input(getAppointmentInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.getAppointment(input.appointmentId)
    }),

  list: tenantProcedure
    .input(listAppointmentsInput)
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listAppointments(input)
    }),

  delete: tenantProcedure
    .input(deleteAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.deleteAppointment(input.appointmentId)
    }),

  cancel: tenantProcedure
    .input(cancelAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.cancelAppointment(input.appointmentId, input.reason)
    }),

  confirm: tenantProcedure
    .input(confirmAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.confirmAppointment(input.appointmentId)
    }),

  complete: tenantProcedure
    .input(completeAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.completeAppointment(input.appointmentId, input.notes)
    }),

  myAppointments: tenantProcedure
    .input(listAppointmentsInput.omit({ providerId: true }))
    .query(async ({ input, ctx }) => {
      const service = new AppointmentsService(ctx.db, ctx.tenantId)
      return service.listMyAppointments(ctx.user.id, input)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main Router
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentsRouter = router({
  appointments: appointmentsSubRouter,
  services: servicesRouter,
  providers: providersRouter,
  availability: availabilityRouter,
})

export type AppointmentsRouter = typeof appointmentsRouter
