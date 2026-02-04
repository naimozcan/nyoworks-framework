// ═══════════════════════════════════════════════════════════════════════════════
// Appointments Routes - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import { appointmentsService } from "./service"
import type { AuthContext } from "../../core/auth/middleware"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const appointmentsRoutes = new Hono<{ Variables: AuthContext }>()

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const createAppointmentSchema = z.object({
  providerId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
})

const slotsQuerySchema = z.object({
  providerId: z.string().uuid(),
  date: z.string().date(),
  duration: z.coerce.number().min(15).default(30),
})

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

appointmentsRoutes.post(
  "/",
  zValidator("json", createAppointmentSchema),
  async (c) => {
    const user = c.get("user")
    const data = c.req.valid("json")

    const appointment = await appointmentsService.create({
      tenantId: user.tid,
      customerId: user.sub,
      providerId: data.providerId,
      serviceId: data.serviceId,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      notes: data.notes,
    })

    return c.json({ data: appointment }, 201)
  }
)

appointmentsRoutes.get("/", async (c) => {
  const user = c.get("user")
  const upcoming = c.req.query("upcoming") === "true"

  const appointments = await appointmentsService.getByCustomer(
    user.tid,
    user.sub,
    { upcoming }
  )

  return c.json({ data: appointments })
})

appointmentsRoutes.get("/:id", async (c) => {
  const user = c.get("user")
  const id = c.req.param("id")

  const appointment = await appointmentsService.getById(user.tid, id)

  if (!appointment) {
    return c.json({ error: "Appointment not found" }, 404)
  }

  return c.json({ data: appointment })
})

appointmentsRoutes.patch("/:id/cancel", async (c) => {
  const user = c.get("user")
  const id = c.req.param("id")
  const { reason } = await c.req.json<{ reason?: string }>()

  const appointment = await appointmentsService.cancel(user.tid, id, reason)

  if (!appointment) {
    return c.json({ error: "Appointment not found" }, 404)
  }

  return c.json({ data: appointment })
})

appointmentsRoutes.get(
  "/slots",
  zValidator("query", slotsQuerySchema),
  async (c) => {
    const user = c.get("user")
    const { providerId, date, duration } = c.req.valid("query")

    const slots = await appointmentsService.getAvailableSlots(
      user.tid,
      providerId,
      new Date(date),
      duration
    )

    return c.json({ data: slots })
  }
)
