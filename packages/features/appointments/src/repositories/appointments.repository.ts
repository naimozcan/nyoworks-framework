// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Repository
// ═══════════════════════════════════════════════════════════════════════════════

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
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewAppointment, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Appointment> {
    const db = this.db as any
    const [result] = await db
      .insert(appointments)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<Appointment | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Appointment, "id" | "tenantId" | "createdAt">>): Promise<Appointment | null> {
    const db = this.db as any
    const [result] = await db
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
    const db = this.db as any
    const result = await db
      .delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(options: AppointmentListOptions): Promise<AppointmentListResult> {
    const db = this.db as any
    const { limit, offset, sortBy = "startTime", sortOrder = "desc" } = options

    let query = db
      .select()
      .from(appointments)
      .where(eq(appointments.tenantId, this.tenantId))

    if (options.providerId) {
      query = query.where(eq(appointments.providerId, options.providerId))
    }

    if (options.serviceId) {
      query = query.where(eq(appointments.serviceId, options.serviceId))
    }

    if (options.userId) {
      query = query.where(eq(appointments.userId, options.userId))
    }

    if (options.status) {
      query = query.where(eq(appointments.status, options.status))
    }

    if (options.startDate) {
      query = query.where(gte(appointments.startTime, options.startDate))
    }

    if (options.endDate) {
      query = query.where(lte(appointments.startTime, options.endDate))
    }

    const sortColumns = {
      startTime: appointments.startTime,
      createdAt: appointments.createdAt,
      status: appointments.status,
    } as const
    const orderFn = sortOrder === "asc" ? asc : desc
    const sortColumn = sortColumns[sortBy] ?? appointments.startTime
    query = query.orderBy(orderFn(sortColumn))

    const items = await query.limit(limit).offset(offset)

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.tenantId, this.tenantId))

    const total = countResult[0]?.count ?? 0

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }

  async findByProviderAndDateRange(providerId: string, startDate: Date, endDate: Date, excludeStatuses?: string[]): Promise<Appointment[]> {
    const db = this.db as any
    let query = db
      .select()
      .from(appointments)
      .where(
        and(
          eq(appointments.providerId, providerId),
          gte(appointments.startTime, startDate),
          lte(appointments.startTime, endDate)
        )
      )

    if (excludeStatuses && excludeStatuses.length > 0) {
      query = query.where(sql`${appointments.status} NOT IN (${sql.join(excludeStatuses.map(s => sql`${s}`), sql`, `)})`)
    }

    return query
  }

  async count(): Promise<number> {
    const db = this.db as any
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(appointments)
      .where(eq(appointments.tenantId, this.tenantId))

    return result[0]?.count ?? 0
  }
}
