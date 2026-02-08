// ═══════════════════════════════════════════════════════════════════════════════
// CORS Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import { cors } from "hono/cors"
import { getServerEnv, isDevelopment } from "@nyoworks/shared"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

function getAllowedOrigins(): string[] {
  const env = getServerEnv()
  const origins: string[] = [
    "http://localhost:3000",
    "http://localhost:5173",
  ]

  if (env.WEB_URL) origins.push(env.WEB_URL)
  if (env.MOBILE_URL) origins.push(env.MOBILE_URL)
  if (env.CORS_ORIGINS) origins.push(...env.CORS_ORIGINS)

  return origins
}

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

export const corsMiddleware = cors({
  origin: (origin) => {
    const allowedOrigins = getAllowedOrigins()
    if (!origin) return allowedOrigins[0]
    if (allowedOrigins.includes(origin)) return origin
    if (isDevelopment()) return origin
    return allowedOrigins[0]
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  exposeHeaders: ["X-Request-ID"],
  maxAge: 86400,
  credentials: true,
})
