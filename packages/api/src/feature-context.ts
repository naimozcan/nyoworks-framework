// ═══════════════════════════════════════════════════════════════════════════════
// Feature Context Types
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import type { User } from "./context"

// ─────────────────────────────────────────────────────────────────────────────
// Base Feature Context
// ─────────────────────────────────────────────────────────────────────────────

export interface FeatureContext {
  user: User | null
  tenantId: string | null
  db: DrizzleDatabase
  requestId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated Context (after isAuthenticated middleware)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticatedContext extends FeatureContext {
  user: User
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Context (after requireTenant middleware)
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantContext extends AuthenticatedContext {
  tenantId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Info Context (with request metadata)
// ─────────────────────────────────────────────────────────────────────────────

export interface RequestInfoContext extends FeatureContext {
  requestInfo?: {
    userAgent?: string
    ipAddress?: string
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated Request Context (combined)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticatedRequestContext extends AuthenticatedContext, RequestInfoContext {
  user: User
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Request Context (full context)
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantRequestContext extends TenantContext, RequestInfoContext {
  user: User
  tenantId: string
}
