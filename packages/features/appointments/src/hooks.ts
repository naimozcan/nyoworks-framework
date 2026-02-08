// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Feature - React Hooks
// ═══════════════════════════════════════════════════════════════════════════════

import { useCallback, useState } from "react"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string
  userId: string
  providerId: string
  serviceId: string
  status: string
  startTime: Date
  endTime: Date
  notes?: string
  cancellationReason?: string
  createdAt: Date
}

interface Service {
  id: string
  name: string
  description?: string
  duration: number
  price?: number
  currency: string
  isActive: boolean
}

interface Provider {
  id: string
  name: string
  email?: string
  phone?: string
  bio?: string
  avatarUrl?: string
  isActive: boolean
}

interface Availability {
  id: string
  providerId: string
  dayOfWeek: number
  startTime: string
  endTime: string
  isAvailable: boolean
}

interface TimeSlot {
  startTime: Date
  endTime: Date
  available: boolean
}

interface ListResponse<T> {
  items: T[]
  total?: number
  hasMore?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// useAppointments Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseAppointmentsOptions {
  providerId?: string
  serviceId?: string
  status?: string
  startDate?: string
  endDate?: string
  limit?: number
}

export function useAppointments(options: UseAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchAppointments = useCallback(async (offset = 0) => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("offset", String(offset))
      if (options.limit) params.set("limit", String(options.limit))
      if (options.providerId) params.set("providerId", options.providerId)
      if (options.serviceId) params.set("serviceId", options.serviceId)
      if (options.status) params.set("status", options.status)
      if (options.startDate) params.set("startDate", options.startDate)
      if (options.endDate) params.set("endDate", options.endDate)

      const response = await fetch(`/api/appointments?${params}`)
      if (!response.ok) throw new Error("Failed to fetch appointments")

      const data: ListResponse<Appointment> = await response.json()

      if (offset === 0) {
        setAppointments(data.items)
      } else {
        setAppointments(prev => [...prev, ...data.items])
      }
      setHasMore(data.hasMore || false)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [options.providerId, options.serviceId, options.status, options.startDate, options.endDate, options.limit])

  const createAppointment = useCallback(async (data: {
    providerId: string
    serviceId: string
    startTime: string
    notes?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create appointment")

      const appointment: Appointment = await response.json()
      setAppointments(prev => [appointment, ...prev])
      return appointment
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const cancelAppointment = useCallback(async (appointmentId: string, reason?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) throw new Error("Failed to cancel appointment")

      const updated: Appointment = await response.json()
      setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const confirmAppointment = useCallback(async (appointmentId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/confirm`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to confirm appointment")

      const updated: Appointment = await response.json()
      setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const completeAppointment = useCallback(async (appointmentId: string, notes?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) throw new Error("Failed to complete appointment")

      const updated: Appointment = await response.json()
      setAppointments(prev => prev.map(a => a.id === appointmentId ? updated : a))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    appointments,
    isLoading,
    error,
    hasMore,
    fetchAppointments,
    createAppointment,
    cancelAppointment,
    confirmAppointment,
    completeAppointment,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useServices Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseServicesOptions {
  isActive?: boolean
}

export function useServices(options: UseServicesOptions = {}) {
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchServices = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.isActive !== undefined) params.set("isActive", String(options.isActive))

      const response = await fetch(`/api/appointments/services?${params}`)
      if (!response.ok) throw new Error("Failed to fetch services")

      const data: ListResponse<Service> = await response.json()
      setServices(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [options.isActive])

  const createService = useCallback(async (data: {
    name: string
    description?: string
    duration: number
    price?: number
    currency?: string
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/appointments/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create service")

      const service: Service = await response.json()
      setServices(prev => [...prev, service])
      return service
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateService = useCallback(async (serviceId: string, data: Partial<Service>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/services/${serviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update service")

      const updated: Service = await response.json()
      setServices(prev => prev.map(s => s.id === serviceId ? updated : s))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteService = useCallback(async (serviceId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/services/${serviceId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete service")

      setServices(prev => prev.filter(s => s.id !== serviceId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    services,
    isLoading,
    error,
    fetchServices,
    createService,
    updateService,
    deleteService,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useProviders Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseProvidersOptions {
  isActive?: boolean
  serviceId?: string
}

export function useProviders(options: UseProvidersOptions = {}) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchProviders = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (options.isActive !== undefined) params.set("isActive", String(options.isActive))
      if (options.serviceId) params.set("serviceId", options.serviceId)

      const response = await fetch(`/api/appointments/providers?${params}`)
      if (!response.ok) throw new Error("Failed to fetch providers")

      const data: ListResponse<Provider> = await response.json()
      setProviders(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [options.isActive, options.serviceId])

  const createProvider = useCallback(async (data: {
    name: string
    email?: string
    phone?: string
    bio?: string
    serviceIds?: string[]
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/appointments/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to create provider")

      const provider: Provider = await response.json()
      setProviders(prev => [...prev, provider])
      return provider
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateProvider = useCallback(async (providerId: string, data: Partial<Provider>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/providers/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to update provider")

      const updated: Provider = await response.json()
      setProviders(prev => prev.map(p => p.id === providerId ? updated : p))
      return updated
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteProvider = useCallback(async (providerId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/providers/${providerId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete provider")

      setProviders(prev => prev.filter(p => p.id !== providerId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    providers,
    isLoading,
    error,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useAvailability Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAvailability(providerId: string | null) {
  const [availability, setAvailability] = useState<Availability[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchAvailability = useCallback(async () => {
    if (!providerId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/providers/${providerId}/availability`)
      if (!response.ok) throw new Error("Failed to fetch availability")

      const data: ListResponse<Availability> = await response.json()
      setAvailability(data.items)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [providerId])

  const setAvailabilitySlot = useCallback(async (data: {
    dayOfWeek: number
    startTime: string
    endTime: string
    isAvailable?: boolean
  }) => {
    if (!providerId) throw new Error("Provider ID required")

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/providers/${providerId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) throw new Error("Failed to set availability")

      const slot: Availability = await response.json()
      setAvailability(prev => {
        const existing = prev.findIndex(a => a.dayOfWeek === data.dayOfWeek)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = slot
          return updated
        }
        return [...prev, slot]
      })
      return slot
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [providerId])

  const deleteAvailabilitySlot = useCallback(async (availabilityId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/appointments/availability/${availabilityId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete availability")

      setAvailability(prev => prev.filter(a => a.id !== availabilityId))
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    availability,
    isLoading,
    error,
    fetchAvailability,
    setAvailabilitySlot,
    deleteAvailabilitySlot,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// useBooking Hook
// ─────────────────────────────────────────────────────────────────────────────

interface UseBookingOptions {
  providerId?: string
  serviceId?: string
}

export function useBooking(options: UseBookingOptions = {}) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)

  const fetchAvailableSlots = useCallback(async (date: string) => {
    if (!options.providerId || !options.serviceId) {
      setError(new Error("Provider and Service are required"))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("providerId", options.providerId)
      params.set("serviceId", options.serviceId)
      params.set("date", date)

      const response = await fetch(`/api/appointments/availability/check?${params}`)
      if (!response.ok) throw new Error("Failed to fetch available slots")

      const data = await response.json()

      if (!data.available) {
        setSlots([])
        return
      }

      const generatedSlots: TimeSlot[] = []
      const { availability: avail, bookedSlots, serviceDuration } = data

      if (avail) {
        const [startHour, startMin] = avail.startTime.split(":").map(Number)
        const [endHour, endMin] = avail.endTime.split(":").map(Number)

        const dateObj = new Date(date)
        let current = new Date(dateObj)
        current.setHours(startHour, startMin, 0, 0)

        const endTime = new Date(dateObj)
        endTime.setHours(endHour, endMin, 0, 0)

        while (current.getTime() + serviceDuration * 60000 <= endTime.getTime()) {
          const slotEnd = new Date(current.getTime() + serviceDuration * 60000)

          const isBooked = bookedSlots.some((booked: Appointment) => {
            const bookedStart = new Date(booked.startTime).getTime()
            const bookedEnd = new Date(booked.endTime).getTime()
            const slotStart = current.getTime()
            const slotEndTime = slotEnd.getTime()

            return (slotStart < bookedEnd && slotEndTime > bookedStart)
          })

          generatedSlots.push({
            startTime: new Date(current),
            endTime: slotEnd,
            available: !isBooked,
          })

          current = new Date(current.getTime() + 15 * 60000)
        }
      }

      setSlots(generatedSlots)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
    } finally {
      setIsLoading(false)
    }
  }, [options.providerId, options.serviceId])

  const bookAppointment = useCallback(async (notes?: string) => {
    if (!selectedSlot || !options.providerId || !options.serviceId) {
      throw new Error("Select a time slot first")
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: options.providerId,
          serviceId: options.serviceId,
          startTime: selectedSlot.startTime.toISOString(),
          notes,
        }),
      })

      if (!response.ok) throw new Error("Failed to book appointment")

      const appointment: Appointment = await response.json()
      setSelectedSlot(null)
      return appointment
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [selectedSlot, options.providerId, options.serviceId])

  const selectSlot = useCallback((slot: TimeSlot | null) => {
    if (slot && !slot.available) return
    setSelectedSlot(slot)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedSlot(null)
  }, [])

  return {
    slots,
    selectedSlot,
    isLoading,
    error,
    fetchAvailableSlots,
    selectSlot,
    clearSelection,
    bookAppointment,
  }
}
