// ═══════════════════════════════════════════════════════════════════════════════
// Auth Middleware - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { verifyAccessToken, type AccessTokenPayload } from "./jwt"

// ─────────────────────────────────────────────────────────────────────────────
// Context Types
// ─────────────────────────────────────────────────────────────────────────────

declare module "hono" {
  interface ContextVariableMap {
    userId: string
    tenantId: string
    role: string
    permissions: string[]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Middleware (Required)
// ─────────────────────────────────────────────────────────────────────────────

export const auth = () =>
  createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization")

    if (!authHeader?.startsWith("Bearer ")) {
      throw new HTTPException(401, { message: "Missing authorization header" })
    }

    const token = authHeader.slice(7)

    try {
      const payload = await verifyAccessToken(token)
      c.set("userId", payload.sub)
      c.set("tenantId", payload.tid)
      c.set("role", payload.role)
      c.set("permissions", payload.permissions)
      await next()
    } catch {
      throw new HTTPException(401, { message: "Invalid or expired token" })
    }
  })

// ─────────────────────────────────────────────────────────────────────────────
// Optional Auth Middleware
// ─────────────────────────────────────────────────────────────────────────────

export const optionalAuth = () =>
  createMiddleware(async (c, next) => {
    const authHeader = c.req.header("Authorization")

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7)

      try {
        const payload = await verifyAccessToken(token)
        c.set("userId", payload.sub)
        c.set("tenantId", payload.tid)
        c.set("role", payload.role)
        c.set("permissions", payload.permissions)
      } catch {
        // Token invalid, continue as unauthenticated
      }
    }

    await next()
  })

// ─────────────────────────────────────────────────────────────────────────────
// Extract Token from Cookie
// ─────────────────────────────────────────────────────────────────────────────

export function extractTokenFromCookie(c: { req: { header: (name: string) => string | undefined } }): string | null {
  const cookies = c.req.header("Cookie")
  if (!cookies) return null

  const match = cookies.match(/access_token=([^;]+)/)
  return match ? match[1] : null
}
