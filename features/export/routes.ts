// ═══════════════════════════════════════════════════════════════════════════════
// Export Routes - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"
import { z } from "zod"
import { zValidator } from "@hono/zod-validator"
import { exportService } from "./service"
import type { AuthContext } from "../../core/auth/middleware"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const exportRoutes = new Hono<{ Variables: AuthContext }>()

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

const exportRequestSchema = z.object({
  entity: z.string().min(1),
  format: z.enum(["csv", "json", "pdf"]),
  filters: z.record(z.unknown()).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

exportRoutes.post("/", zValidator("json", exportRequestSchema), async (c) => {
  const user = c.get("user")
  const { entity, format } = c.req.valid("json")

  const job = await exportService.createExportJob(
    user.tid,
    user.sub,
    entity,
    format
  )

  return c.json({ data: job }, 202)
})
