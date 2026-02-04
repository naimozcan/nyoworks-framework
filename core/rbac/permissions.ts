// ═══════════════════════════════════════════════════════════════════════════════
// RBAC Permissions
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Core Permissions
// ─────────────────────────────────────────────────────────────────────────────

export const CORE_PERMISSIONS = {
  users: ["users:read", "users:create", "users:update", "users:delete"],
  roles: ["roles:read", "roles:create", "roles:update", "roles:delete"],
  settings: ["settings:read", "settings:update"],
  profile: ["profile:read", "profile:update"],
  tenant: ["tenant:read", "tenant:update"],
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Feature Permissions (loaded dynamically)
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURE_PERMISSIONS: Record<string, string[]> = {
  payments: [
    "payments:read",
    "payments:create",
    "payments:refund",
    "subscriptions:read",
    "subscriptions:manage",
  ],
  appointments: [
    "appointments:read",
    "appointments:create",
    "appointments:update",
    "appointments:delete",
    "calendar:read",
    "calendar:manage",
  ],
  inventory: [
    "inventory:read",
    "inventory:create",
    "inventory:update",
    "inventory:delete",
    "stock:adjust",
    "warehouses:manage",
  ],
  crm: [
    "contacts:read",
    "contacts:create",
    "contacts:update",
    "contacts:delete",
    "deals:read",
    "deals:manage",
  ],
  cms: [
    "content:read",
    "content:create",
    "content:update",
    "content:delete",
    "content:publish",
  ],
  ecommerce: [
    "products:read",
    "products:create",
    "products:update",
    "products:delete",
    "orders:read",
    "orders:manage",
  ],
  analytics: [
    "analytics:read",
    "reports:read",
    "reports:export",
  ],
  notifications: [
    "notifications:read",
    "notifications:send",
    "notifications:manage",
  ],
  audit: [
    "audit:read",
  ],
  export: [
    "export:csv",
    "export:pdf",
  ],
  realtime: [
    "realtime:connect",
    "realtime:broadcast",
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  if (userPermissions.includes("*")) return true

  const [resource, action] = requiredPermission.split(":")
  const wildcardPermission = `${resource}:*`

  return (
    userPermissions.includes(requiredPermission) ||
    userPermissions.includes(wildcardPermission)
  )
}

export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some((p) => hasPermission(userPermissions, p))
}

export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every((p) => hasPermission(userPermissions, p))
}

export function getAllPermissionsForFeatures(enabledFeatures: string[]): string[] {
  const permissions: string[] = []

  Object.values(CORE_PERMISSIONS).forEach((perms) => {
    permissions.push(...perms)
  })

  enabledFeatures.forEach((feature) => {
    const featurePerms = FEATURE_PERMISSIONS[feature]
    if (featurePerms) {
      permissions.push(...featurePerms)
    }
  })

  return [...new Set(permissions)]
}
