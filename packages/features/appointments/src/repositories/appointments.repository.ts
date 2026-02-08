// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm"
import { appointments, type Appointment, type NewAppointment } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppointmentListOptions {
  providerId?: string
  serviceId?: string
  userId?: string
  status?: string
  startDate?: Date
  endDate?: Date
  limit: number
  offset: number
  sortBy?: "startTime" | "createdAt" | "status"
  sortOrder?: "asc" | "desc"
}

export interface AppointmentListResult {
  items: Appointment[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class AppointmentsRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewAppointment, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Appointment> {
    const [result] = await this.db
      .insert(appointments)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<Appointment | null> {
    const result = await this.db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Appointment, "id" | "tenantId" | "createdAt">>): Promise<Appointment | null> {
    const [result] = await this.db
      .update(appointments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(options: AppointmentListOptions): Promise<AppointmentListResult> {
    const { limit, offset, sortBy = "startTime", sortOrder = "desc" } = options

    const conditions = [eq(appointments.tenantId, this.tenantId)]

    if (options.providerId) {
      conditions.push(eq(appointments.providerId, options.providerId))
    }

    if (options.serviceId) {
      conditions.push(eq(appointments.serviceId, options.serviceId))
    }

    if (options.userId) {
      conditions.push(eq(appointments.userId, options.userId))
    }

    if (options.status) {
      conditions.push(eq(appointments.status, options.status))
    }

    if (options.startDate) {
      conditions.push(gte(appointments.startTime, options.startDate))
    }

    if (options.endDate) {
      conditions.push(lte(appointments.startTime, options.endDate))
    }

    const sortColumns = {
      startTime: appointments.startTime,
      createdAt: appointments.createdAt,
      status: appointments.status,
    } as const
    const orderFn = sortOrder === "asc" ? asc : desc
    const sortColumn = sortColumns[sortBy] ?? appointments.startTime

    const items = await this.db
      .select()
      .from(appointments)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.tenantId, this.tenantId))

    const total = Number(countResult[0]?.count ?? 0)

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }

  async findByProviderAndDateRange(providerId: string, startDate: Date, endDate: Date, excludeStatuses?: string[]): Promise<Appointment[]> {
    const conditions = [
      eq(appointments.providerId, providerId),
      gte(appointments.startTime, startDate),
      lte(appointments.startTime, endDate),
    ]

    if (excludeStatuses && excludeStatuses.length > 0) {
      return this.db
        .select()
        .from(appointments)
        .where(and(
          ...conditions,
          sql`${appointments.status} NOT IN (${sql.join(excludeStatuses.map(s => sql`${s}`), sql`, `)})`
        ))
    }

    return this.db
      .select()
      .from(appointments)
      .where(and(...conditions))
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.tenantId, this.tenantId))

    return Number(result[0]?.count ?? 0)
  }
}
