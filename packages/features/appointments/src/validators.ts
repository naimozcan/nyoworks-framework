// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { PAGINATION } from "@nyoworks/shared/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Common Types
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentStatus = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
])

export const dayOfWeek = z.number().min(0).max(6)

export const timeString = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createAppointmentInput = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startTime: z.string().datetime(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateAppointmentInput = z.object({
  appointmentId: z.string().uuid(),
  providerId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  startTime: z.string().datetime().optional(),
  status: appointmentStatus.optional(),
  notes: z.string().max(2000).optional(),
  cancellationReason: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const getAppointmentInput = z.object({
  appointmentId: z.string().uuid(),
})

export const deleteAppointmentInput = z.object({
  appointmentId: z.string().uuid(),
})

export const listAppointmentsInput = z.object({
  providerId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  status: appointmentStatus.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["startTime", "createdAt"]).default("startTime"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
})

export const cancelAppointmentInput = z.object({
  appointmentId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

export const confirmAppointmentInput = z.object({
  appointmentId: z.string().uuid(),
})

export const completeAppointmentInput = z.object({
  appointmentId: z.string().uuid(),
  notes: z.string().max(2000).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Service Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createServiceInput = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  duration: z.number().min(5).max(480),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).default("USD"),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateServiceInput = z.object({
  serviceId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  duration: z.number().min(5).max(480).optional(),
  price: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const getServiceInput = z.object({
  serviceId: z.string().uuid(),
})

export const deleteServiceInput = z.object({
  serviceId: z.string().uuid(),
})

export const listServicesInput = z.object({
  isActive: z.boolean().optional(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.MAX_LIMIT / 2),
  offset: z.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Provider Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createProviderInput = z.object({
  userId: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const updateProviderInput = z.object({
  providerId: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  bio: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const getProviderInput = z.object({
  providerId: z.string().uuid(),
})

export const deleteProviderInput = z.object({
  providerId: z.string().uuid(),
})

export const listProvidersInput = z.object({
  isActive: z.boolean().optional(),
  serviceId: z.string().uuid().optional(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.MAX_LIMIT / 2),
  offset: z.number().min(0).default(0),
})

export const addServiceToProviderInput = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
})

export const removeServiceFromProviderInput = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Availability Validators
// ─────────────────────────────────────────────────────────────────────────────

export const setAvailabilityInput = z.object({
  providerId: z.string().uuid(),
  dayOfWeek: dayOfWeek,
  startTime: timeString,
  endTime: timeString,
  isAvailable: z.boolean().default(true),
})

export const updateAvailabilityInput = z.object({
  availabilityId: z.string().uuid(),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
  isAvailable: z.boolean().optional(),
})

export const deleteAvailabilityInput = z.object({
  availabilityId: z.string().uuid(),
})

export const getProviderAvailabilityInput = z.object({
  providerId: z.string().uuid(),
})

export const checkAvailabilityInput = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const getAvailableSlotsInput = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slotInterval: z.number().min(5).max(60).default(15),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type AppointmentStatus = z.infer<typeof appointmentStatus>
export type DayOfWeek = z.infer<typeof dayOfWeek>

export type CreateAppointmentInput = z.infer<typeof createAppointmentInput>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentInput>
export type GetAppointmentInput = z.infer<typeof getAppointmentInput>
export type DeleteAppointmentInput = z.infer<typeof deleteAppointmentInput>
export type ListAppointmentsInput = z.infer<typeof listAppointmentsInput>
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentInput>
export type ConfirmAppointmentInput = z.infer<typeof confirmAppointmentInput>
export type CompleteAppointmentInput = z.infer<typeof completeAppointmentInput>

export type CreateServiceInput = z.infer<typeof createServiceInput>
export type UpdateServiceInput = z.infer<typeof updateServiceInput>
export type GetServiceInput = z.infer<typeof getServiceInput>
export type DeleteServiceInput = z.infer<typeof deleteServiceInput>
export type ListServicesInput = z.infer<typeof listServicesInput>

export type CreateProviderInput = z.infer<typeof createProviderInput>
export type UpdateProviderInput = z.infer<typeof updateProviderInput>
export type GetProviderInput = z.infer<typeof getProviderInput>
export type DeleteProviderInput = z.infer<typeof deleteProviderInput>
export type ListProvidersInput = z.infer<typeof listProvidersInput>
export type AddServiceToProviderInput = z.infer<typeof addServiceToProviderInput>
export type RemoveServiceFromProviderInput = z.infer<typeof removeServiceFromProviderInput>

export type SetAvailabilityInput = z.infer<typeof setAvailabilityInput>
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilityInput>
export type DeleteAvailabilityInput = z.infer<typeof deleteAvailabilityInput>
export type GetProviderAvailabilityInput = z.infer<typeof getProviderAvailabilityInput>
export type CheckAvailabilityInput = z.infer<typeof checkAvailabilityInput>
export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsInput>
