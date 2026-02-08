// ═══════════════════════════════════════════════════════════════════════════════
// tRPC Context
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Context {
  user: User | null
  tenantId: string | null
  db: DrizzleDatabase
  requestId: string
  requestInfo?: {
    userAgent?: string
    ipAddress?: string
  }
}

export interface CreateContextOptions {
  authorization: string | null
  tenantId: string | null
  db: DrizzleDatabase
  requestId: string
  requestInfo?: {
    userAgent?: string
    ipAddress?: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Creator
// ─────────────────────────────────────────────────────────────────────────────

export async function createContext(
  opts: CreateContextOptions
): Promise<Context> {
  const { authorization, tenantId, db, requestId, requestInfo } = opts

  let user: User | null = null

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7)
    user = await verifyToken(token)
  }

  return {
    user,
    tenantId,
    db,
    requestId,
    requestInfo,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Verification (placeholder - replace with actual implementation)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyToken(_token: string): Promise<User | null> {
  try {
    return null
  } catch {
    return null
  }
}
