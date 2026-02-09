// ═══════════════════════════════════════════════════════════════════════════════
// API - App-Scoped Context (FAZ 6 Security)
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import type { Context as HonoContext } from "hono"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AppContext {
  user: User | null
  tenantId: string
  appId: string
  db: DrizzleDatabase
  requestId: string
  requestInfo?: {
    userAgent?: string
    ipAddress?: string
  }
}

interface AppContextOptions {
  authorization: string | null
  tenantId: string
  appId: string
  db: DrizzleDatabase
  requestId: string
  requestInfo?: {
    userAgent?: string
    ipAddress?: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App ID Validation
// ─────────────────────────────────────────────────────────────────────────────

const VALID_APP_IDS = [
  "corporate",
  "ecommerce",
  "booking",
  "salon",
  "hr",
  "erp",
  "wms",
  "cms",
  "crm",
  "tms",
  "dashboard",
]

function isValidAppId(appId: string): boolean {
  return VALID_APP_IDS.includes(appId)
}

function extractAppIdFromPath(pathStr: string): string | null {
  const match = pathStr.match(/^\/api\/([a-z]+)\//)
  if (match && match[1] && isValidAppId(match[1])) {
    return match[1]
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// App-Scoped Context Creator
// ─────────────────────────────────────────────────────────────────────────────

async function createAppContext(opts: AppContextOptions): Promise<AppContext> {
  const { authorization, tenantId, appId, db, requestId, requestInfo } = opts

  if (!tenantId) {
    throw new Error("Tenant ID is required for app-scoped requests")
  }

  if (!isValidAppId(appId)) {
    throw new Error(`Invalid app ID: ${appId}`)
  }

  let user: User | null = null

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7)
    user = await verifyToken(token)
  }

  return {
    user,
    tenantId,
    appId,
    db,
    requestId,
    requestInfo,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App-Scoped Route Factory
// ─────────────────────────────────────────────────────────────────────────────

interface AppRouteConfig {
  appId: string
  allowedOrigins?: string[]
  rateLimit?: {
    windowMs: number
    max: number
  }
}

const APP_ROUTE_CONFIGS: Record<string, AppRouteConfig> = {
  ecommerce: {
    appId: "ecommerce",
    allowedOrigins: ["https://shop.*.com", "https://store.*.com"],
    rateLimit: { windowMs: 60000, max: 100 },
  },
  crm: {
    appId: "crm",
    allowedOrigins: ["https://crm.*.com", "https://admin.*.com"],
    rateLimit: { windowMs: 60000, max: 200 },
  },
  salon: {
    appId: "salon",
    allowedOrigins: ["https://booking.*.com", "https://salon.*.com"],
    rateLimit: { windowMs: 60000, max: 150 },
  },
}

function getAppRouteConfig(appId: string): AppRouteConfig {
  return APP_ROUTE_CONFIGS[appId] || {
    appId,
    rateLimit: { windowMs: 60000, max: 100 },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-App Access Prevention Middleware
// ─────────────────────────────────────────────────────────────────────────────

interface CrossAppCheckResult {
  allowed: boolean
  reason?: string
}

function checkCrossAppAccess(
  requestAppId: string,
  resourceAppId: string,
  resourceType: string
): CrossAppCheckResult {
  if (requestAppId === resourceAppId) {
    return { allowed: true }
  }

  const allowedCrossAppResources = [
    "users",
    "tenants",
    "notifications",
    "files",
    "audit_logs",
  ]

  if (allowedCrossAppResources.includes(resourceType)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: `Cross-app access denied: ${requestAppId} cannot access ${resourceAppId}/${resourceType}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CORS Configuration per App
// ─────────────────────────────────────────────────────────────────────────────

interface CORSConfig {
  origin: string | string[] | ((origin: string) => boolean)
  allowMethods: string[]
  allowHeaders: string[]
  credentials: boolean
}

function getAppCORSConfig(appId: string, tenantDomain?: string): CORSConfig {
  const config = getAppRouteConfig(appId)

  const origins: string[] = []

  if (config.allowedOrigins) {
    origins.push(...config.allowedOrigins)
  }

  if (tenantDomain) {
    origins.push(`https://${appId}.${tenantDomain}`)
    origins.push(`https://${tenantDomain}`)
  }

  origins.push("http://localhost:3000", "http://localhost:3001")

  return {
    origin: (requestOrigin: string) => {
      if (!requestOrigin) return true
      return origins.some((pattern) => {
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, "[^.]+") + "$")
          return regex.test(requestOrigin)
        }
        return pattern === requestOrigin
      })
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Tenant-ID",
      "X-App-ID",
      "X-Request-ID",
    ],
    credentials: true,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Verification (placeholder)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyToken(_token: string): Promise<User | null> {
  try {
    return null
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hono Middleware Factory
// ─────────────────────────────────────────────────────────────────────────────

function createAppScopedMiddleware(db: DrizzleDatabase) {
  return async (c: HonoContext, next: () => Promise<void>) => {
    const path = c.req.path
    const appId = extractAppIdFromPath(path)

    if (!appId) {
      return c.json({ error: "App ID required in path" }, 400)
    }

    const tenantId = c.req.header("X-Tenant-ID")

    if (!tenantId) {
      return c.json({ error: "Tenant ID required" }, 400)
    }

    const authorization = c.req.header("Authorization")
    const requestId = c.req.header("X-Request-ID") || crypto.randomUUID()

    try {
      const appContext = await createAppContext({
        authorization: authorization || null,
        tenantId,
        appId,
        db,
        requestId,
        requestInfo: {
          userAgent: c.req.header("User-Agent"),
          ipAddress: c.req.header("X-Forwarded-For") || c.req.header("X-Real-IP"),
        },
      })

      c.set("appContext", appContext)
      c.set("appId", appId)
      c.set("tenantId", tenantId)

      await next()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Context creation failed"
      return c.json({ error: message }, 403)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  createAppContext,
  extractAppIdFromPath,
  isValidAppId,
  getAppRouteConfig,
  checkCrossAppAccess,
  getAppCORSConfig,
  createAppScopedMiddleware,
  VALID_APP_IDS,
}

export type { AppContext, AppContextOptions, AppRouteConfig, CrossAppCheckResult, CORSConfig }
