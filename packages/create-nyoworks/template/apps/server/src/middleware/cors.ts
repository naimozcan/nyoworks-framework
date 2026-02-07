// ═══════════════════════════════════════════════════════════════════════════════
// CORS Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import { cors } from "hono/cors"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.WEB_URL,
  process.env.MOBILE_URL,
].filter(Boolean) as string[]

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export const corsMiddleware = cors({
  origin: (origin) => {
    if (!origin) return allowedOrigins[0]
    if (allowedOrigins.includes(origin)) return origin
    if (process.env.NODE_ENV === "development") return origin
    return allowedOrigins[0]
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposeHeaders: ["X-Request-ID"],
  maxAge: 86400,
  credentials: true,
})
