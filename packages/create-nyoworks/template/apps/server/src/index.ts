// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS API Server - Hono + tRPC
// ═══════════════════════════════════════════════════════════════════════════════

import { Hono } from "hono"
import { trpcServer } from "@hono/trpc-server"
import { appRouter, createContext } from "@nyoworks/api"

import { corsMiddleware } from "./middleware/cors"
import { loggerMiddleware, requestIdMiddleware } from "./middleware/logger"
import { rateLimitMiddleware } from "./middleware/rate-limit"
import { healthRoutes } from "./routes/health"

// ─────────────────────────────────────────────────────────────────────────────
// App Setup
// ─────────────────────────────────────────────────────────────────────────────

const app = new Hono()

// ─────────────────────────────────────────────────────────────────────────────
// Global Middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use("*", loggerMiddleware)
app.use("*", requestIdMiddleware)
app.use("*", corsMiddleware)
app.use("/api/*", rateLimitMiddleware)

// ─────────────────────────────────────────────────────────────────────────────
// Health Routes
// ─────────────────────────────────────────────────────────────────────────────

app.route("/health", healthRoutes)

// ─────────────────────────────────────────────────────────────────────────────
// tRPC Router
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  "/api/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: async ({ req }) => {
      const authorization = req.headers.get("Authorization")
      const tenantId = req.headers.get("X-Tenant-ID")
      const requestId = req.headers.get("X-Request-ID") ?? crypto.randomUUID()

      const ctx = await createContext({
        authorization,
        tenantId,
        requestId,
      })
      return ctx as unknown as Record<string, unknown>
    },
  })
)

// ─────────────────────────────────────────────────────────────────────────────
// Root Route
// ─────────────────────────────────────────────────────────────────────────────

app.get("/", (c) => {
  return c.json({
    name: "NYOWORKS API",
    version: "0.1.0",
    docs: "/api/trpc",
    health: "/health",
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from "@hono/node-server"

const port = Number(process.env.PORT) || 3001

console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           NYOWORKS API Server                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  Port:    ${port.toString().padEnd(68)}║
║  tRPC:    http://localhost:${port}/api/trpc                                    ║
║  Health:  http://localhost:${port}/health                                      ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)

serve({
  fetch: app.fetch,
  port,
})
