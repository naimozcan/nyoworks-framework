// ═══════════════════════════════════════════════════════════════════════════════
// Multitenant Feature - Zod Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"
import { PAGINATION } from "@nyoworks/shared/constants"

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Validators
// ─────────────────────────────────────────────────────────────────────────────

export const tenantStatus = z.enum(["active", "suspended", "inactive"])
export const tenantPlan = z.enum(["free", "starter", "pro", "enterprise"])
export const memberRole = z.enum(["owner", "admin", "member", "viewer"])

export const createTenantInput = z.object({
  name: z.string().min(1).max(PAGINATION.MAX_LIMIT),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  domain: z.string().max(255).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  plan: tenantPlan.default("free"),
})

export const updateTenantInput = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(PAGINATION.MAX_LIMIT).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  domain: z.string().max(255).nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  plan: tenantPlan.optional(),
  status: tenantStatus.optional(),
})

export const getTenantInput = z.object({
  tenantId: z.string().uuid(),
})

export const getTenantBySlugInput = z.object({
  slug: z.string().min(2).max(50),
})

export const deleteTenantInput = z.object({
  tenantId: z.string().uuid(),
})

export const listTenantsInput = z.object({
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(0),
  status: tenantStatus.optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Member Validators
// ─────────────────────────────────────────────────────────────────────────────

export const inviteMemberInput = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: memberRole.default("member"),
})

export const removeMemberInput = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
})

export const updateMemberRoleInput = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: memberRole,
})

export const listMembersInput = z.object({
  tenantId: z.string().uuid(),
  limit: z.number().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.MAX_LIMIT / 2),
  offset: z.number().min(0).default(0),
})

export const acceptInviteInput = z.object({
  token: z.string().min(1),
})

export const cancelInviteInput = z.object({
  inviteId: z.string().uuid(),
})

export const listInvitesInput = z.object({
  tenantId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Switch Tenant Validator
// ─────────────────────────────────────────────────────────────────────────────

export const switchTenantInput = z.object({
  tenantId: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type TenantStatus = z.infer<typeof tenantStatus>
export type TenantPlan = z.infer<typeof tenantPlan>
export type MemberRole = z.infer<typeof memberRole>

export type CreateTenantInput = z.infer<typeof createTenantInput>
export type UpdateTenantInput = z.infer<typeof updateTenantInput>
export type GetTenantInput = z.infer<typeof getTenantInput>
export type GetTenantBySlugInput = z.infer<typeof getTenantBySlugInput>
export type DeleteTenantInput = z.infer<typeof deleteTenantInput>
export type ListTenantsInput = z.infer<typeof listTenantsInput>

export type InviteMemberInput = z.infer<typeof inviteMemberInput>
export type RemoveMemberInput = z.infer<typeof removeMemberInput>
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleInput>
export type ListMembersInput = z.infer<typeof listMembersInput>
export type AcceptInviteInput = z.infer<typeof acceptInviteInput>
export type CancelInviteInput = z.infer<typeof cancelInviteInput>
export type ListInvitesInput = z.infer<typeof listInvitesInput>

export type SwitchTenantInput = z.infer<typeof switchTenantInput>
