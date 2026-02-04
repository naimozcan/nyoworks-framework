// ═══════════════════════════════════════════════════════════════════════════════
// Notifications Routes - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import { notificationsService } from "./service"
import type { AuthContext } from "../../core/auth/middleware"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const notificationsRoutes = new Hono<{ Variables: AuthContext }>()

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
})

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

notificationsRoutes.get("/", zValidator("query", listQuerySchema), async (c) => {
  const user = c.get("user")
  const { limit, offset, unreadOnly } = c.req.valid("query")

  const notifications = await notificationsService.getByUser(user.tid, user.sub, {
    limit,
    offset,
    unreadOnly,
  })

  return c.json({ data: notifications })
})

notificationsRoutes.get("/unread-count", async (c) => {
  const user = c.get("user")
  const count = await notificationsService.getUnreadCount(user.tid, user.sub)

  return c.json({ data: { count } })
})

notificationsRoutes.patch("/:id/read", async (c) => {
  const user = c.get("user")
  const notificationId = c.req.param("id")

  const notification = await notificationsService.markAsRead(
    user.tid,
    user.sub,
    notificationId
  )

  if (!notification) {
    return c.json({ error: "Notification not found" }, 404)
  }

  return c.json({ data: notification })
})

notificationsRoutes.post("/read-all", async (c) => {
  const user = c.get("user")
  const count = await notificationsService.markAllAsRead(user.tid, user.sub)

  return c.json({ data: { marked: count } })
})
