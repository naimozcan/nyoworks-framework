// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Feature - tRPC Router
// ═══════════════════════════════════════════════════════════════════════════════

import { initTRPC, TRPCError } from "@trpc/server"
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm"
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
import { appointments, services, providers, providerServices, availability } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Context Type
// ─────────────────────────────────────────────────────────────────────────────

interface AppointmentsContext {
  user?: { id: string; email: string }
  tenantId?: string
  db: {
    select: (table: unknown) => unknown
    insert: (table: unknown) => unknown
    update: (table: unknown) => unknown
    delete: (table: unknown) => unknown
  }
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
      const db = ctx.db as never

      const [service] = await db
        .insert(services)
        .values({
          ...input,
          tenantId: ctx.tenantId,
        })
        .returning()

      return service
    }),

  update: protectedProcedure
    .input(updateServiceInput)
    .mutation(async ({ input, ctx }) => {
      const { serviceId, ...updateData } = input
      const db = ctx.db as never

      const [service] = await db
        .update(services)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(services.id, serviceId), eq(services.tenantId, ctx.tenantId)))
        .returning()

      if (!service) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
      }

      return service
    }),

  get: protectedProcedure
    .input(getServiceInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const service = await db
        .select()
        .from(services)
        .where(and(eq(services.id, input.serviceId), eq(services.tenantId, ctx.tenantId)))
        .limit(1)

      if (!service[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
      }

      return service[0]
    }),

  list: protectedProcedure
    .input(listServicesInput)
    .query(async ({ input, ctx }) => {
      const { isActive, limit, offset } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(services)
        .where(eq(services.tenantId, ctx.tenantId))

      if (isActive !== undefined) {
        query = query.where(eq(services.isActive, isActive))
      }

      const items = await query
        .orderBy(asc(services.name))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  delete: protectedProcedure
    .input(deleteServiceInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(services)
        .where(and(eq(services.id, input.serviceId), eq(services.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
      }

      return { success: true }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Providers Router
// ─────────────────────────────────────────────────────────────────────────────

const providersRouter = t.router({
  create: protectedProcedure
    .input(createProviderInput)
    .mutation(async ({ input, ctx }) => {
      const { serviceIds, ...providerData } = input
      const db = ctx.db as never

      const [provider] = await db
        .insert(providers)
        .values({
          ...providerData,
          tenantId: ctx.tenantId,
        })
        .returning()

      if (serviceIds && serviceIds.length > 0) {
        await db.insert(providerServices).values(
          serviceIds.map((serviceId: string) => ({
            providerId: provider.id,
            serviceId,
          }))
        )
      }

      return provider
    }),

  update: protectedProcedure
    .input(updateProviderInput)
    .mutation(async ({ input, ctx }) => {
      const { providerId, ...updateData } = input
      const db = ctx.db as never

      const [provider] = await db
        .update(providers)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(providers.id, providerId), eq(providers.tenantId, ctx.tenantId)))
        .returning()

      if (!provider) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" })
      }

      return provider
    }),

  get: protectedProcedure
    .input(getProviderInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const provider = await db
        .select()
        .from(providers)
        .where(and(eq(providers.id, input.providerId), eq(providers.tenantId, ctx.tenantId)))
        .limit(1)

      if (!provider[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" })
      }

      return provider[0]
    }),

  list: protectedProcedure
    .input(listProvidersInput)
    .query(async ({ input, ctx }) => {
      const { isActive, limit, offset } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(providers)
        .where(eq(providers.tenantId, ctx.tenantId))

      if (isActive !== undefined) {
        query = query.where(eq(providers.isActive, isActive))
      }

      const items = await query
        .orderBy(asc(providers.name))
        .limit(limit)
        .offset(offset)

      return { items }
    }),

  delete: protectedProcedure
    .input(deleteProviderInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(providers)
        .where(and(eq(providers.id, input.providerId), eq(providers.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" })
      }

      return { success: true }
    }),

  addService: protectedProcedure
    .input(addServiceToProviderInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db.insert(providerServices).values({
        providerId: input.providerId,
        serviceId: input.serviceId,
      })

      return { success: true }
    }),

  removeService: protectedProcedure
    .input(removeServiceFromProviderInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      await db
        .delete(providerServices)
        .where(
          and(
            eq(providerServices.providerId, input.providerId),
            eq(providerServices.serviceId, input.serviceId)
          )
        )

      return { success: true }
    }),

  getServices: protectedProcedure
    .input(getProviderInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const result = await db
        .select({ service: services })
        .from(providerServices)
        .innerJoin(services, eq(providerServices.serviceId, services.id))
        .where(eq(providerServices.providerId, input.providerId))

      return result.map((r: { service: unknown }) => r.service)
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Availability Router
// ─────────────────────────────────────────────────────────────────────────────

const availabilityRouter = t.router({
  set: protectedProcedure
    .input(setAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const existing = await db
        .select()
        .from(availability)
        .where(
          and(
            eq(availability.providerId, input.providerId),
            eq(availability.dayOfWeek, input.dayOfWeek)
          )
        )
        .limit(1)

      if (existing[0]) {
        const [updated] = await db
          .update(availability)
          .set({
            startTime: input.startTime,
            endTime: input.endTime,
            isAvailable: input.isAvailable,
            updatedAt: new Date(),
          })
          .where(eq(availability.id, existing[0].id))
          .returning()

        return updated
      }

      const [created] = await db
        .insert(availability)
        .values(input)
        .returning()

      return created
    }),

  update: protectedProcedure
    .input(updateAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const { availabilityId, ...updateData } = input
      const db = ctx.db as never

      const [updated] = await db
        .update(availability)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(availability.id, availabilityId))
        .returning()

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Availability not found" })
      }

      return updated
    }),

  delete: protectedProcedure
    .input(deleteAvailabilityInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(availability)
        .where(eq(availability.id, input.availabilityId))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Availability not found" })
      }

      return { success: true }
    }),

  getForProvider: protectedProcedure
    .input(getProviderAvailabilityInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const items = await db
        .select()
        .from(availability)
        .where(eq(availability.providerId, input.providerId))
        .orderBy(asc(availability.dayOfWeek))

      return { items }
    }),

  checkSlots: protectedProcedure
    .input(checkAvailabilityInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { providerId, serviceId, date } = input

      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1)

      if (!service[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
      }

      const dateObj = new Date(date)
      const dayOfWeek = dateObj.getDay()

      const providerAvailability = await db
        .select()
        .from(availability)
        .where(
          and(
            eq(availability.providerId, providerId),
            eq(availability.dayOfWeek, dayOfWeek),
            eq(availability.isAvailable, true)
          )
        )
        .limit(1)

      if (!providerAvailability[0]) {
        return { available: false, slots: [] }
      }

      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const existingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.providerId, providerId),
            gte(appointments.startTime, startOfDay),
            lte(appointments.startTime, endOfDay),
            sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
          )
        )

      return {
        available: true,
        availability: providerAvailability[0],
        bookedSlots: existingAppointments,
        serviceDuration: service[0].duration,
      }
    }),

  getSlots: protectedProcedure
    .input(getAvailableSlotsInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never
      const { providerId, serviceId, startDate, endDate, slotInterval } = input

      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, serviceId))
        .limit(1)

      if (!service[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
      }

      const providerAvailabilities = await db
        .select()
        .from(availability)
        .where(
          and(
            eq(availability.providerId, providerId),
            eq(availability.isAvailable, true)
          )
        )

      const start = new Date(startDate)
      const end = endDate ? new Date(endDate) : new Date(startDate)
      end.setDate(end.getDate() + 1)

      const existingAppointments = await db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.providerId, providerId),
            gte(appointments.startTime, start),
            lte(appointments.startTime, end),
            sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
          )
        )

      return {
        availabilities: providerAvailabilities,
        bookedSlots: existingAppointments,
        serviceDuration: service[0].duration,
        slotInterval,
      }
    }),
})

// ─────────────────────────────────────────────────────────────────────────────
// Appointments Router
// ─────────────────────────────────────────────────────────────────────────────

const appointmentsSubRouter = t.router({
  create: protectedProcedure
    .input(createAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const service = await db
        .select()
        .from(services)
        .where(eq(services.id, input.serviceId))
        .limit(1)

      if (!service[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
      }

      const startTime = new Date(input.startTime)
      const endTime = new Date(startTime.getTime() + service[0].duration * 60000)

      const [appointment] = await db
        .insert(appointments)
        .values({
          ...input,
          startTime,
          endTime,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
        })
        .returning()

      return appointment
    }),

  update: protectedProcedure
    .input(updateAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const { appointmentId, startTime: inputStartTime, serviceId, ...updateData } = input
      const db = ctx.db as never

      const updatePayload: Record<string, unknown> = {
        ...updateData,
        updatedAt: new Date(),
      }

      if (inputStartTime) {
        const service = await db
          .select()
          .from(services)
          .where(eq(services.id, serviceId || input.serviceId!))
          .limit(1)

        if (service[0]) {
          const startTime = new Date(inputStartTime)
          const endTime = new Date(startTime.getTime() + service[0].duration * 60000)
          updatePayload.startTime = startTime
          updatePayload.endTime = endTime
        }
      }

      if (serviceId) {
        updatePayload.serviceId = serviceId
      }

      const [appointment] = await db
        .update(appointments)
        .set(updatePayload)
        .where(and(eq(appointments.id, appointmentId), eq(appointments.tenantId, ctx.tenantId)))
        .returning()

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
      }

      return appointment
    }),

  get: protectedProcedure
    .input(getAppointmentInput)
    .query(async ({ input, ctx }) => {
      const db = ctx.db as never

      const appointment = await db
        .select()
        .from(appointments)
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.tenantId, ctx.tenantId)))
        .limit(1)

      if (!appointment[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
      }

      return appointment[0]
    }),

  list: protectedProcedure
    .input(listAppointmentsInput)
    .query(async ({ input, ctx }) => {
      const { providerId, serviceId, status, startDate, endDate, limit, offset, sortBy, sortOrder } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(appointments)
        .where(eq(appointments.tenantId, ctx.tenantId))

      if (providerId) {
        query = query.where(eq(appointments.providerId, providerId))
      }

      if (serviceId) {
        query = query.where(eq(appointments.serviceId, serviceId))
      }

      if (status) {
        query = query.where(eq(appointments.status, status))
      }

      if (startDate) {
        query = query.where(gte(appointments.startTime, new Date(startDate)))
      }

      if (endDate) {
        query = query.where(lte(appointments.startTime, new Date(endDate)))
      }

      const orderFn = sortOrder === "asc" ? asc : desc
      query = query.orderBy(orderFn(appointments[sortBy as keyof typeof appointments]))

      const items = await query.limit(limit).offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(eq(appointments.tenantId, ctx.tenantId))

      return {
        items,
        total: countResult[0]?.count || 0,
        hasMore: offset + limit < (countResult[0]?.count || 0),
      }
    }),

  delete: protectedProcedure
    .input(deleteAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [deleted] = await db
        .delete(appointments)
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.tenantId, ctx.tenantId)))
        .returning()

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
      }

      return { success: true }
    }),

  cancel: protectedProcedure
    .input(cancelAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [appointment] = await db
        .update(appointments)
        .set({
          status: "cancelled",
          cancellationReason: input.reason,
          updatedAt: new Date(),
        })
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.tenantId, ctx.tenantId)))
        .returning()

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
      }

      return appointment
    }),

  confirm: protectedProcedure
    .input(confirmAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const [appointment] = await db
        .update(appointments)
        .set({
          status: "confirmed",
          updatedAt: new Date(),
        })
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.tenantId, ctx.tenantId)))
        .returning()

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
      }

      return appointment
    }),

  complete: protectedProcedure
    .input(completeAppointmentInput)
    .mutation(async ({ input, ctx }) => {
      const db = ctx.db as never

      const updatePayload: Record<string, unknown> = {
        status: "completed",
        updatedAt: new Date(),
      }

      if (input.notes) {
        updatePayload.notes = input.notes
      }

      const [appointment] = await db
        .update(appointments)
        .set(updatePayload)
        .where(and(eq(appointments.id, input.appointmentId), eq(appointments.tenantId, ctx.tenantId)))
        .returning()

      if (!appointment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
      }

      return appointment
    }),

  myAppointments: protectedProcedure
    .input(listAppointmentsInput.omit({ providerId: true }))
    .query(async ({ input, ctx }) => {
      const { status, startDate, endDate, limit, offset, sortBy, sortOrder } = input
      const db = ctx.db as never

      let query = db
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, ctx.tenantId),
            eq(appointments.userId, ctx.user.id)
          )
        )

      if (status) {
        query = query.where(eq(appointments.status, status))
      }

      if (startDate) {
        query = query.where(gte(appointments.startTime, new Date(startDate)))
      }

      if (endDate) {
        query = query.where(lte(appointments.startTime, new Date(endDate)))
      }

      const orderFn = sortOrder === "asc" ? asc : desc
      query = query.orderBy(orderFn(appointments[sortBy as keyof typeof appointments]))

      const items = await query.limit(limit).offset(offset)

      return { items }
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
