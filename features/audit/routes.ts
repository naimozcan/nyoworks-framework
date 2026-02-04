// ═══════════════════════════════════════════════════════════════════════════════
// Audit Routes - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import { auditService } from "./service"
import type { AuthContext } from "../../core/auth/middleware"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const auditRoutes = new Hono<{ Variables: AuthContext }>()

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const querySchema = z.object({
  userId: z.string().uuid().optional(),
  entity: z.string().optional(),
  entityId: z.string().uuid().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

auditRoutes.get("/", zValidator("query", querySchema), async (c) => {
  const user = c.get("user")
  const query = c.req.valid("query")

  const logs = await auditService.query(user.tid, {
    ...query,
    startDate: query.startDate ? new Date(query.startDate) : undefined,
    endDate: query.endDate ? new Date(query.endDate) : undefined,
  })

  return c.json({ data: logs })
})

auditRoutes.get("/entity/:entity/:entityId", async (c) => {
  const user = c.get("user")
  const entity = c.req.param("entity")
  const entityId = c.req.param("entityId")

  const logs = await auditService.getByEntity(user.tid, entity, entityId)

  return c.json({ data: logs })
})

auditRoutes.get("/user/:userId", async (c) => {
  const user = c.get("user")
  const userId = c.req.param("userId")

  const logs = await auditService.getByUser(user.tid, userId)

  return c.json({ data: logs })
})
