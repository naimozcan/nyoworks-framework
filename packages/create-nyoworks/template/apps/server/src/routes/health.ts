// ═══════════════════════════════════════════════════════════════════════════════
// Health Check Routes
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

export const healthRoutes = new Hono()

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

healthRoutes.get("/", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

healthRoutes.get("/ready", (c) => {
  return c.json({
    status: "ready",
    checks: {
      api: true,
    },
  })
})

healthRoutes.get("/live", (c) => {
  return c.json({ status: "live" })
})
