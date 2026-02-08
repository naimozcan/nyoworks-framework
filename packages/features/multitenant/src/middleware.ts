// ═══════════════════════════════════════════════════════════════════════════════
// Multitenant Feature - Middleware
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and } from "drizzle-orm"
import { tenants, tenantMembers } from "./schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TenantContext {
  tenantId: string
  tenantSlug: string
  tenantName: string
  tenantPlan: string
  userRole: string
}

interface ResolveTenantOptions {
  db: {
    select: (table: unknown) => unknown
  }
  userId: string
  tenantIdOrSlug?: string
  headerTenantId?: string
  cookieTenantId?: string
}

interface ResolveTenantResult {
  success: boolean
  context?: TenantContext
  error?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Resolution
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveTenant(options: ResolveTenantOptions): Promise<ResolveTenantResult> {
  const { db, userId, tenantIdOrSlug, headerTenantId, cookieTenantId } = options

  const tenantIdentifier = tenantIdOrSlug || headerTenantId || cookieTenantId

  if (!tenantIdentifier) {
    return { success: false, error: "No tenant identifier provided" }
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdentifier)

  const dbTyped = db as never
  const tenant = await dbTyped
    .select()
    .from(tenants)
    .where(isUuid ? eq(tenants.id, tenantIdentifier) : eq(tenants.slug, tenantIdentifier))
    .limit(1)

  if (!tenant[0]) {
    return { success: false, error: "Tenant not found" }
  }

  if (tenant[0].status !== "active") {
    return { success: false, error: "Tenant is not active" }
  }

  const member = await dbTyped
    .select()
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.tenantId, tenant[0].id),
        eq(tenantMembers.userId, userId)
      )
    )
    .limit(1)

  if (!member[0]) {
    return { success: false, error: "User is not a member of this tenant" }
  }

  return {
    success: true,
    context: {
      tenantId: tenant[0].id,
      tenantSlug: tenant[0].slug,
      tenantName: tenant[0].name,
      tenantPlan: tenant[0].plan,
      userRole: member[0].role,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Default Tenant
// ─────────────────────────────────────────────────────────────────────────────

interface GetDefaultTenantOptions {
  db: {
    select: (table: unknown) => unknown
  }
  userId: string
}

export async function getDefaultTenant(options: GetDefaultTenantOptions): Promise<ResolveTenantResult> {
  const { db, userId } = options

  const dbTyped = db as never
  const memberships = await dbTyped
    .select({
      tenantId: tenantMembers.tenantId,
      role: tenantMembers.role,
      joinedAt: tenantMembers.joinedAt,
    })
    .from(tenantMembers)
    .where(eq(tenantMembers.userId, userId))

  if (memberships.length === 0) {
    return { success: false, error: "User has no tenant memberships" }
  }

  const ownerMembership = memberships.find((m: { role: string }) => m.role === "owner")
  const targetMembership = ownerMembership || memberships[0]

  const tenant = await dbTyped
    .select()
    .from(tenants)
    .where(eq(tenants.id, targetMembership.tenantId))
    .limit(1)

  if (!tenant[0]) {
    return { success: false, error: "Tenant not found" }
  }

  if (tenant[0].status !== "active") {
    return { success: false, error: "Tenant is not active" }
  }

  return {
    success: true,
    context: {
      tenantId: tenant[0].id,
      tenantSlug: tenant[0].slug,
      tenantName: tenant[0].name,
      tenantPlan: tenant[0].plan,
      userRole: targetMembership.role,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check Tenant Permission
// ─────────────────────────────────────────────────────────────────────────────

type Permission = "read" | "write" | "admin" | "owner"

const rolePermissions: Record<string, Permission[]> = {
  owner: ["read", "write", "admin", "owner"],
  admin: ["read", "write", "admin"],
  member: ["read", "write"],
  viewer: ["read"],
}

export function hasPermission(userRole: string, requiredPermission: Permission): boolean {
  const permissions = rolePermissions[userRole] || []
  return permissions.includes(requiredPermission)
}

export function requirePermission(userRole: string, requiredPermission: Permission): void {
  if (!hasPermission(userRole, requiredPermission)) {
    throw new Error(`Permission denied: requires ${requiredPermission}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export type { TenantContext, ResolveTenantOptions, ResolveTenantResult, Permission }
