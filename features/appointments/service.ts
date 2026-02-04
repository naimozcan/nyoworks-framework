// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Service
// ═══════════════════════════════════════════════════════════════════════════════

import { db, eq, and, gte, lte, desc } from "../../core/database/client"
import { appointments, availability, appointmentServices } from "./schema"
import { createLogger } from "../../core/shared/logger"
import type { Appointment, NewAppointment, Availability, AppointmentService } from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const logger = createLogger("appointments-service")

// ─────────────────────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────────────────────

async function create(data: NewAppointment): Promise<Appointment> {
  const isAvailable = await checkAvailability(
    data.tenantId,
    data.providerId!,
    data.startTime,
    data.endTime
  )

  if (!isAvailable) {
    throw new Error("Time slot is not available")
  }

  const [appointment] = await db
    .insert(appointments)
    .values(data)
    .returning()

  logger.info({ appointmentId: appointment.id }, "Appointment created")
  return appointment
}

async function getById(tenantId: string, id: string): Promise<Appointment | null> {
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .limit(1)

  return appointment ?? null
}

async function getByCustomer(
  tenantId: string,
  customerId: string,
  options: { upcoming?: boolean; limit?: number } = {}
): Promise<Appointment[]> {
  const { upcoming = false, limit = 20 } = options

  const conditions = [
    eq(appointments.tenantId, tenantId),
    eq(appointments.customerId, customerId),
  ]

  if (upcoming) {
    conditions.push(gte(appointments.startTime, new Date()))
  }

  return db
    .select()
    .from(appointments)
    .where(and(...conditions))
    .orderBy(appointments.startTime)
    .limit(limit)
}

async function getByProvider(
  tenantId: string,
  providerId: string,
  startDate: Date,
  endDate: Date
): Promise<Appointment[]> {
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.providerId, providerId),
        gte(appointments.startTime, startDate),
        lte(appointments.endTime, endDate)
      )
    )
    .orderBy(appointments.startTime)
}

async function updateStatus(
  tenantId: string,
  id: string,
  status: string
): Promise<Appointment | null> {
  const [updated] = await db
    .update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .returning()

  return updated ?? null
}

async function cancel(
  tenantId: string,
  id: string,
  reason?: string
): Promise<Appointment | null> {
  const [updated] = await db
    .update(appointments)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      cancelReason: reason,
      updatedAt: new Date(),
    })
    .where(and(eq(appointments.id, id), eq(appointments.tenantId, tenantId)))
    .returning()

  return updated ?? null
}

// ─────────────────────────────────────────────────────────────────────────────
// Availability
// ─────────────────────────────────────────────────────────────────────────────

async function checkAvailability(
  tenantId: string,
  providerId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const conflicts = await db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.tenantId, tenantId),
        eq(appointments.providerId, providerId),
        lte(appointments.startTime, endTime),
        gte(appointments.endTime, startTime)
      )
    )
    .limit(1)

  return conflicts.length === 0
}

async function getAvailableSlots(
  tenantId: string,
  providerId: string,
  date: Date,
  duration: number
): Promise<Array<{ start: Date; end: Date }>> {
  const dayOfWeek = date.getDay()

  const providerAvailability = await db
    .select()
    .from(availability)
    .where(
      and(
        eq(availability.tenantId, tenantId),
        eq(availability.userId, providerId),
        eq(availability.dayOfWeek, dayOfWeek),
        eq(availability.isActive, true)
      )
    )

  if (providerAvailability.length === 0) return []

  const slots: Array<{ start: Date; end: Date }> = []

  for (const avail of providerAvailability) {
    const [startHour, startMin] = avail.startTime.split(":").map(Number)
    const [endHour, endMin] = avail.endTime.split(":").map(Number)

    let currentTime = new Date(date)
    currentTime.setHours(startHour, startMin, 0, 0)

    const endTimeLimit = new Date(date)
    endTimeLimit.setHours(endHour, endMin, 0, 0)

    while (currentTime < endTimeLimit) {
      const slotEnd = new Date(currentTime.getTime() + duration * 60000)

      if (slotEnd <= endTimeLimit) {
        const isAvailable = await checkAvailability(
          tenantId,
          providerId,
          currentTime,
          slotEnd
        )

        if (isAvailable) {
          slots.push({ start: new Date(currentTime), end: slotEnd })
        }
      }

      currentTime = new Date(currentTime.getTime() + duration * 60000)
    }
  }

  return slots
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentsService = {
  create,
  getById,
  getByCustomer,
  getByProvider,
  updateStatus,
  cancel,
  checkAvailability,
  getAvailableSlots,
}
