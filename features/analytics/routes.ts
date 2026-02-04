// ═══════════════════════════════════════════════════════════════════════════════
// Analytics Routes - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import { analyticsService } from "./service"
import type { AuthContext } from "../../core/auth/middleware"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const analyticsRoutes = new Hono<{ Variables: AuthContext }>()

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const trackEventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
  context: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
})

const trackBatchSchema = z.object({
  events: z.array(trackEventSchema).min(1).max(100),
})

const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

analyticsRoutes.post("/track", zValidator("json", trackEventSchema), async (c) => {
  const user = c.get("user")
  const data = c.req.valid("json")

  const event = await analyticsService.track({
    tenantId: user.tid,
    userId: user.sub,
    event: data.event,
    properties: data.properties,
    context: data.context,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
  })

  return c.json({ data: event }, 201)
})

analyticsRoutes.post("/track/batch", zValidator("json", trackBatchSchema), async (c) => {
  const user = c.get("user")
  const { events } = c.req.valid("json")

  const count = await analyticsService.trackBatch(
    events.map((e) => ({
      tenantId: user.tid,
      userId: user.sub,
      event: e.event,
      properties: e.properties,
      context: e.context,
      timestamp: e.timestamp ? new Date(e.timestamp) : new Date(),
    }))
  )

  return c.json({ data: { tracked: count } }, 201)
})

analyticsRoutes.get("/dashboard", zValidator("query", dateRangeSchema), async (c) => {
  const user = c.get("user")
  const { startDate, endDate } = c.req.valid("query")

  const stats = await analyticsService.getDashboardStats(
    user.tid,
    new Date(startDate),
    new Date(endDate)
  )

  return c.json({ data: stats })
})

analyticsRoutes.get("/events", async (c) => {
  const user = c.get("user")
  const event = c.req.query("event")
  const limit = parseInt(c.req.query("limit") || "100", 10)

  const events = await analyticsService.getEvents(user.tid, { event, limit })

  return c.json({ data: events })
})
