// ═══════════════════════════════════════════════════════════════════════════════
// RBAC Middleware - Hono
// ═══════════════════════════════════════════════════════════════════════════════

import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { hasPermission, hasAnyPermission, hasAllPermissions } from "./permissions"

// ─────────────────────────────────────────────────────────────────────────────
// Require Permission
// ─────────────────────────────────────────────────────────────────────────────

export const requirePermission = (permission: string) =>
  createMiddleware(async (c, next) => {
    const permissions = c.get("permissions") || []

    if (!hasPermission(permissions, permission)) {
      throw new HTTPException(403, {
        message: `Missing required permission: ${permission}`,
      })
    }

    await next()
  })

// ─────────────────────────────────────────────────────────────────────────────
// Require Any Permission
// ─────────────────────────────────────────────────────────────────────────────

export const requireAnyPermission = (requiredPermissions: string[]) =>
  createMiddleware(async (c, next) => {
    const permissions = c.get("permissions") || []

    if (!hasAnyPermission(permissions, requiredPermissions)) {
      throw new HTTPException(403, {
        message: `Missing one of required permissions: ${requiredPermissions.join(", ")}`,
      })
    }

    await next()
  })

// ─────────────────────────────────────────────────────────────────────────────
// Require All Permissions
// ─────────────────────────────────────────────────────────────────────────────

export const requireAllPermissions = (requiredPermissions: string[]) =>
  createMiddleware(async (c, next) => {
    const permissions = c.get("permissions") || []

    if (!hasAllPermissions(permissions, requiredPermissions)) {
      throw new HTTPException(403, {
        message: `Missing required permissions: ${requiredPermissions.join(", ")}`,
      })
    }

    await next()
  })

// ─────────────────────────────────────────────────────────────────────────────
// Require Role
// ─────────────────────────────────────────────────────────────────────────────

export const requireRole = (allowedRoles: string[]) =>
  createMiddleware(async (c, next) => {
    const role = c.get("role")

    if (!role || !allowedRoles.includes(role)) {
      throw new HTTPException(403, {
        message: `Access restricted to roles: ${allowedRoles.join(", ")}`,
      })
    }

    await next()
  })

// ─────────────────────────────────────────────────────────────────────────────
// Require Owner or Admin
// ─────────────────────────────────────────────────────────────────────────────

export const requireOwnerOrAdmin = () =>
  createMiddleware(async (c, next) => {
    const role = c.get("role")

    if (!role || !["owner", "admin"].includes(role)) {
      throw new HTTPException(403, {
        message: "Access restricted to owners and admins",
      })
    }

    await next()
  })
