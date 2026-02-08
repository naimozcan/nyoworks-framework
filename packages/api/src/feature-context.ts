// ═══════════════════════════════════════════════════════════════════════════════
// Feature Context Types
// ═══════════════════════════════════════════════════════════════════════════════

import type { Context, User } from "./context"

// ─────────────────────────────────────────────────────────────────────────────
// Re-export Context as FeatureContext (same type)
// ─────────────────────────────────────────────────────────────────────────────

export type FeatureContext = Context

// ─────────────────────────────────────────────────────────────────────────────
// Authenticated Context (after isAuthenticated middleware)
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticatedContext extends Context {
  user: User
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Context (after requireTenant middleware)
// ─────────────────────────────────────────────────────────────────────────────

export interface TenantContext extends AuthenticatedContext {
  tenantId: string
}
