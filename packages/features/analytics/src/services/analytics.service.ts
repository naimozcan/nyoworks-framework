// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import { randomUUID } from "crypto"
import {
  EventsRepository,
  PageviewsRepository,
  SessionsRepository,
  type DateCount,
  type EventCount,
  type PageCount,
  type SessionStats,
} from "../repositories/index.js"
import type { AnalyticsSession } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackEventInput {
  userId?: string
  sessionId?: string
  eventName: string
  eventType?: string
  properties?: Record<string, unknown>
  userAgent?: string
  ipAddress?: string
  referrer?: string
  pathname?: string
  timestamp?: Date
}

export interface TrackEventResult {
  id: string
  eventName: string
  timestamp: Date
}

export interface TrackPageviewInput {
  userId?: string
  sessionId?: string
  pathname: string
  title?: string
  referrer?: string
  userAgent?: string
  ipAddress?: string
  country?: string
  city?: string
  duration?: number
}

export interface TrackPageviewResult {
  id: string
  pathname: string
  timestamp: Date
}

export interface CreateSessionInput {
  userId?: string
  userAgent?: string
  ipAddress?: string
  country?: string
  city?: string
  referrer?: string
  entryPage?: string
}

export interface CreateSessionResult {
  id: string
  sessionId: string
  startedAt: Date
}

export interface UpdateSessionInput {
  sessionId: string
  exitPage?: string
  endedAt?: Date
}

export interface QueryOptions {
  startDate: Date
  endDate: Date
  eventName?: string
  limit?: number
  groupBy?: "hour" | "day" | "week" | "month"
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class AnalyticsService {
  private readonly eventsRepo: EventsRepository
  private readonly pageviewsRepo: PageviewsRepository
  private readonly sessionsRepo: SessionsRepository

  constructor(
    db: DrizzleDatabase,
    tenantId: string
  ) {
    this.eventsRepo = new EventsRepository(db, tenantId)
    this.pageviewsRepo = new PageviewsRepository(db, tenantId)
    this.sessionsRepo = new SessionsRepository(db, tenantId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tracking
  // ─────────────────────────────────────────────────────────────────────────────

  async trackEvent(input: TrackEventInput): Promise<TrackEventResult> {
    const event = await this.eventsRepo.create({
      userId: input.userId,
      sessionId: input.sessionId,
      eventName: input.eventName,
      eventType: input.eventType ?? "track",
      properties: input.properties,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      referrer: input.referrer,
      pathname: input.pathname,
      timestamp: input.timestamp ?? new Date(),
    })

    if (input.sessionId) {
      await this.eventsRepo.incrementSessionEventCount(input.sessionId)
    }

    return {
      id: event.id,
      eventName: event.eventName,
      timestamp: event.timestamp,
    }
  }

  async trackPageview(input: TrackPageviewInput): Promise<TrackPageviewResult> {
    const pageview = await this.pageviewsRepo.create({
      userId: input.userId,
      sessionId: input.sessionId,
      pathname: input.pathname,
      title: input.title,
      referrer: input.referrer,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      country: input.country,
      city: input.city,
      duration: input.duration,
    })

    if (input.sessionId) {
      await this.pageviewsRepo.incrementSessionPageviewCount(input.sessionId, input.pathname)
    }

    return {
      id: pageview.id,
      pathname: pageview.pathname,
      timestamp: pageview.timestamp,
    }
  }

  async identify(input: TrackEventInput): Promise<{ id: string }> {
    if (!input.userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "User ID is required for identify" })
    }

    const event = await this.eventsRepo.create({
      userId: input.userId,
      sessionId: input.sessionId,
      eventName: "identify",
      eventType: "identify",
      properties: input.properties,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    })

    return { id: event.id }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Sessions
  // ─────────────────────────────────────────────────────────────────────────────

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    const sessionId = randomUUID()

    const session = await this.sessionsRepo.create({
      userId: input.userId,
      sessionId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      country: input.country,
      city: input.city,
      referrer: input.referrer,
      entryPage: input.entryPage,
    })

    return {
      id: session.id,
      sessionId: session.sessionId,
      startedAt: session.startedAt,
    }
  }

  async updateSession(input: UpdateSessionInput): Promise<AnalyticsSession> {
    const session = await this.sessionsRepo.update(input.sessionId, {
      exitPage: input.exitPage,
      endedAt: input.endedAt ?? new Date(),
    })

    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" })
    }

    return session
  }

  async getSession(sessionId: string): Promise<AnalyticsSession | null> {
    return this.sessionsRepo.findBySessionId(sessionId)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────────

  async getEventCounts(options: QueryOptions): Promise<DateCount[]> {
    return this.eventsRepo.countByDateRange(
      {
        startDate: options.startDate,
        endDate: options.endDate,
        eventName: options.eventName,
      },
      options.groupBy ?? "day"
    )
  }

  async getTopEvents(options: QueryOptions): Promise<EventCount[]> {
    return this.eventsRepo.getTopEvents({
      startDate: options.startDate,
      endDate: options.endDate,
      limit: options.limit ?? 10,
    })
  }

  async getPageviewCounts(options: QueryOptions): Promise<DateCount[]> {
    return this.pageviewsRepo.countByDateRange(
      {
        startDate: options.startDate,
        endDate: options.endDate,
      },
      options.groupBy ?? "day"
    )
  }

  async getTopPages(options: QueryOptions): Promise<PageCount[]> {
    return this.pageviewsRepo.getTopPages({
      startDate: options.startDate,
      endDate: options.endDate,
      limit: options.limit ?? 10,
    })
  }

  async getSessionStats(options: QueryOptions): Promise<SessionStats> {
    return this.sessionsRepo.getStats({
      startDate: options.startDate,
      endDate: options.endDate,
    })
  }

  async getUniqueUsers(options: QueryOptions): Promise<{ count: number }> {
    const count = await this.eventsRepo.countUniqueUsers({
      startDate: options.startDate,
      endDate: options.endDate,
    })

    return { count }
  }
}
