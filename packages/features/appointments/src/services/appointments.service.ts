// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import {
  ServicesRepository,
  ProvidersRepository,
  AvailabilityRepository,
  AppointmentsRepository,
  type ServiceListResult,
  type ProviderListResult,
  type AvailabilityListResult,
  type AppointmentListResult,
} from "../repositories/index.js"
import type { Service, Provider, Availability, Appointment } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateServiceInput {
  name: string
  description?: string
  duration: number
  price?: number
  currency?: string
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface UpdateServiceInput {
  name?: string
  description?: string
  duration?: number
  price?: number
  currency?: string
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface ListServicesInput {
  isActive?: boolean
  limit: number
  offset: number
}

export interface CreateProviderInput {
  userId?: string
  name: string
  email?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  isActive?: boolean
  metadata?: Record<string, unknown>
  serviceIds?: string[]
}

export interface UpdateProviderInput {
  name?: string
  email?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  isActive?: boolean
  metadata?: Record<string, unknown>
}

export interface ListProvidersInput {
  isActive?: boolean
  limit: number
  offset: number
}

export interface SetAvailabilityInput {
  providerId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable?: boolean
}

export interface UpdateAvailabilityInput {
  startTime?: string
  endTime?: string
  isAvailable?: boolean
}

export interface CreateAppointmentInput {
  providerId: string
  serviceId: string
  startTime: string
  notes?: string
  metadata?: Record<string, unknown>
  userId: string
}

export interface UpdateAppointmentInput {
  providerId?: string
  serviceId?: string
  startTime?: string
  notes?: string
  metadata?: Record<string, unknown>
}

export interface ListAppointmentsInput {
  providerId?: string
  serviceId?: string
  status?: string
  startDate?: string
  endDate?: string
  limit: number
  offset: number
  sortBy?: "startTime" | "createdAt" | "status"
  sortOrder?: "asc" | "desc"
}

export interface CheckAvailabilityInput {
  providerId: string
  serviceId: string
  date: string
}

export interface GetAvailableSlotsInput {
  providerId: string
  serviceId: string
  startDate: string
  endDate?: string
  slotInterval?: number
}

export interface CheckAvailabilityResult {
  available: boolean
  availability?: Availability
  bookedSlots?: Appointment[]
  serviceDuration?: number
  slots?: string[]
}

export interface GetAvailableSlotsResult {
  availabilities: Availability[]
  bookedSlots: Appointment[]
  serviceDuration: number
  slotInterval: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class AppointmentsService {
  private readonly servicesRepo: ServicesRepository
  private readonly providersRepo: ProvidersRepository
  private readonly availabilityRepo: AvailabilityRepository
  private readonly appointmentsRepo: AppointmentsRepository

  constructor(db: DrizzleDatabase, tenantId: string) {
    this.servicesRepo = new ServicesRepository(db, tenantId)
    this.providersRepo = new ProvidersRepository(db, tenantId)
    this.availabilityRepo = new AvailabilityRepository(db)
    this.appointmentsRepo = new AppointmentsRepository(db, tenantId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Services
  // ─────────────────────────────────────────────────────────────────────────────

  async createService(input: CreateServiceInput): Promise<Service> {
    return this.servicesRepo.create(input)
  }

  async updateService(serviceId: string, input: UpdateServiceInput): Promise<Service> {
    const service = await this.servicesRepo.update(serviceId, input)

    if (!service) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
    }

    return service
  }

  async getService(serviceId: string): Promise<Service> {
    const service = await this.servicesRepo.findById(serviceId)

    if (!service) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
    }

    return service
  }

  async listServices(input: ListServicesInput): Promise<ServiceListResult> {
    return this.servicesRepo.list(input)
  }

  async deleteService(serviceId: string): Promise<{ success: boolean }> {
    const deleted = await this.servicesRepo.delete(serviceId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
    }

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Providers
  // ─────────────────────────────────────────────────────────────────────────────

  async createProvider(input: CreateProviderInput): Promise<Provider> {
    const { serviceIds, ...providerData } = input
    const provider = await this.providersRepo.create(providerData)

    if (serviceIds && serviceIds.length > 0) {
      await this.providersRepo.addServices(provider.id, serviceIds)
    }

    return provider
  }

  async updateProvider(providerId: string, input: UpdateProviderInput): Promise<Provider> {
    const provider = await this.providersRepo.update(providerId, input)

    if (!provider) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" })
    }

    return provider
  }

  async getProvider(providerId: string): Promise<Provider> {
    const provider = await this.providersRepo.findById(providerId)

    if (!provider) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" })
    }

    return provider
  }

  async listProviders(input: ListProvidersInput): Promise<ProviderListResult> {
    return this.providersRepo.list(input)
  }

  async deleteProvider(providerId: string): Promise<{ success: boolean }> {
    const deleted = await this.providersRepo.delete(providerId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" })
    }

    return { success: true }
  }

  async addServiceToProvider(providerId: string, serviceId: string): Promise<{ success: boolean }> {
    await this.providersRepo.addService(providerId, serviceId)
    return { success: true }
  }

  async removeServiceFromProvider(providerId: string, serviceId: string): Promise<{ success: boolean }> {
    await this.providersRepo.removeService(providerId, serviceId)
    return { success: true }
  }

  async getProviderServices(providerId: string): Promise<unknown[]> {
    return this.providersRepo.getServices(providerId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Availability
  // ─────────────────────────────────────────────────────────────────────────────

  async setAvailability(input: SetAvailabilityInput): Promise<Availability> {
    const existing = await this.availabilityRepo.findByProviderAndDay(input.providerId, input.dayOfWeek)

    if (existing) {
      const updated = await this.availabilityRepo.update(existing.id, {
        startTime: input.startTime,
        endTime: input.endTime,
        isAvailable: input.isAvailable,
      })

      return updated!
    }

    return this.availabilityRepo.create(input)
  }

  async updateAvailability(availabilityId: string, input: UpdateAvailabilityInput): Promise<Availability> {
    const updated = await this.availabilityRepo.update(availabilityId, input)

    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Availability not found" })
    }

    return updated
  }

  async deleteAvailability(availabilityId: string): Promise<{ success: boolean }> {
    const deleted = await this.availabilityRepo.delete(availabilityId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Availability not found" })
    }

    return { success: true }
  }

  async getProviderAvailability(providerId: string): Promise<AvailabilityListResult> {
    return this.availabilityRepo.listByProvider(providerId)
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<CheckAvailabilityResult> {
    const service = await this.servicesRepo.findById(input.serviceId)

    if (!service) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
    }

    const dateObj = new Date(input.date)
    const dayOfWeek = dateObj.getDay()

    const providerAvailability = await this.availabilityRepo.getActiveByProviderAndDay(input.providerId, dayOfWeek)

    if (!providerAvailability) {
      return { available: false, slots: [] }
    }

    const startOfDay = new Date(input.date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(input.date)
    endOfDay.setHours(23, 59, 59, 999)

    const bookedSlots = await this.appointmentsRepo.findByProviderAndDateRange(
      input.providerId,
      startOfDay,
      endOfDay,
      ["cancelled", "no_show"]
    )

    return {
      available: true,
      availability: providerAvailability,
      bookedSlots,
      serviceDuration: service.duration,
    }
  }

  async getAvailableSlots(input: GetAvailableSlotsInput): Promise<GetAvailableSlotsResult> {
    const service = await this.servicesRepo.findById(input.serviceId)

    if (!service) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
    }

    const availabilities = await this.availabilityRepo.getActiveByProvider(input.providerId)

    const start = new Date(input.startDate)
    const end = input.endDate ? new Date(input.endDate) : new Date(input.startDate)
    end.setDate(end.getDate() + 1)

    const bookedSlots = await this.appointmentsRepo.findByProviderAndDateRange(
      input.providerId,
      start,
      end,
      ["cancelled", "no_show"]
    )

    return {
      availabilities,
      bookedSlots,
      serviceDuration: service.duration,
      slotInterval: input.slotInterval ?? 30,
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Appointments
  // ─────────────────────────────────────────────────────────────────────────────

  async createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
    const service = await this.servicesRepo.findById(input.serviceId)

    if (!service) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" })
    }

    const startTime = new Date(input.startTime)
    const endTime = new Date(startTime.getTime() + service.duration * 60000)

    return this.appointmentsRepo.create({
      ...input,
      startTime,
      endTime,
    })
  }

  async updateAppointment(appointmentId: string, input: UpdateAppointmentInput, currentServiceId?: string): Promise<Appointment> {
    const updateData: Record<string, unknown> = { ...input }

    if (input.startTime) {
      const serviceId = input.serviceId ?? currentServiceId
      if (serviceId) {
        const service = await this.servicesRepo.findById(serviceId)

        if (service) {
          const startTime = new Date(input.startTime)
          const endTime = new Date(startTime.getTime() + service.duration * 60000)
          updateData.startTime = startTime
          updateData.endTime = endTime
        }
      }
    }

    const appointment = await this.appointmentsRepo.update(appointmentId, updateData)

    if (!appointment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
    }

    return appointment
  }

  async getAppointment(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepo.findById(appointmentId)

    if (!appointment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
    }

    return appointment
  }

  async listAppointments(input: ListAppointmentsInput): Promise<AppointmentListResult> {
    return this.appointmentsRepo.list({
      ...input,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    })
  }

  async listMyAppointments(userId: string, input: Omit<ListAppointmentsInput, "providerId">): Promise<{ items: Appointment[] }> {
    const result = await this.appointmentsRepo.list({
      ...input,
      userId,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    })

    return { items: result.items }
  }

  async deleteAppointment(appointmentId: string): Promise<{ success: boolean }> {
    const deleted = await this.appointmentsRepo.delete(appointmentId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
    }

    return { success: true }
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepo.update(appointmentId, {
      status: "cancelled",
      cancellationReason: reason,
    })

    if (!appointment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
    }

    return appointment
  }

  async confirmAppointment(appointmentId: string): Promise<Appointment> {
    const appointment = await this.appointmentsRepo.update(appointmentId, {
      status: "confirmed",
    })

    if (!appointment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
    }

    return appointment
  }

  async completeAppointment(appointmentId: string, notes?: string): Promise<Appointment> {
    const updateData: Record<string, unknown> = {
      status: "completed",
    }

    if (notes) {
      updateData.notes = notes
    }

    const appointment = await this.appointmentsRepo.update(appointmentId, updateData)

    if (!appointment) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Appointment not found" })
    }

    return appointment
  }
}
