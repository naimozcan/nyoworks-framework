// ═══════════════════════════════════════════════════════════════════════════════
// Multitenant Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import { TenantsRepository, MembersRepository, InvitesRepository } from "../repositories/index.js"
import type { Tenant, TenantMember, TenantInvite } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CreateTenantInput {
  name: string
  slug: string
  domain?: string
  settings?: Record<string, unknown>
  plan?: string
}

interface UpdateTenantInput {
  tenantId: string
  name?: string
  slug?: string
  domain?: string | null
  settings?: Record<string, unknown>
  plan?: string
  status?: string
}

interface ListTenantsInput {
  limit: number
  offset: number
  status?: string
}

interface InviteMemberInput {
  tenantId: string
  email: string
  role?: string
}

interface UpdateMemberRoleInput {
  tenantId: string
  userId: string
  role: string
}

interface ListMembersInput {
  tenantId: string
  limit: number
  offset: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateInviteToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class MultitenantService {
  private readonly tenantsRepo: TenantsRepository
  private readonly membersRepo: MembersRepository
  private readonly invitesRepo: InvitesRepository

  constructor(
    db: DrizzleDatabase,
    private readonly currentTenantId?: string
  ) {
    this.tenantsRepo = new TenantsRepository(db)
    this.membersRepo = new MembersRepository(db)
    this.invitesRepo = new InvitesRepository(db)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Tenants
  // ─────────────────────────────────────────────────────────────────────────────

  async createTenant(userId: string, input: CreateTenantInput): Promise<Tenant> {
    const existingSlug = await this.tenantsRepo.findBySlug(input.slug)

    if (existingSlug) {
      throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" })
    }

    const tenant = await this.tenantsRepo.create(input)

    await this.membersRepo.create({
      tenantId: tenant.id,
      userId,
      role: "owner",
      joinedAt: new Date(),
    })

    return tenant
  }

  async updateTenant(input: UpdateTenantInput): Promise<Tenant> {
    const { tenantId, ...updateData } = input

    if (this.currentTenantId && tenantId !== this.currentTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update other tenants" })
    }

    if (updateData.slug) {
      const existingSlug = await this.tenantsRepo.findBySlugExcluding(updateData.slug, tenantId)

      if (existingSlug) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already in use" })
      }
    }

    const tenant = await this.tenantsRepo.update(tenantId, updateData)

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
    }

    return tenant
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantsRepo.findById(tenantId)

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
    }

    return tenant
  }

  async getTenantBySlug(slug: string): Promise<Tenant> {
    const tenant = await this.tenantsRepo.findBySlug(slug)

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
    }

    return tenant
  }

  async listTenants(userId: string, input: ListTenantsInput) {
    const memberTenantIds = await this.membersRepo.findByUser(userId)

    if (memberTenantIds.length === 0) {
      return { items: [], total: 0, hasMore: false }
    }

    const tenantIds = memberTenantIds.map((m) => m.tenantId)

    return this.tenantsRepo.list({
      ...input,
      tenantIds,
    })
  }

  async deleteTenant(userId: string, tenantId: string): Promise<{ success: boolean }> {
    if (this.currentTenantId && tenantId !== this.currentTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete other tenants" })
    }

    const member = await this.membersRepo.findByTenantUserAndRole(tenantId, userId, "owner")

    if (!member) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can delete tenant" })
    }

    const deleted = await this.tenantsRepo.delete(tenantId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
    }

    return { success: true }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Members
  // ─────────────────────────────────────────────────────────────────────────────

  async inviteMember(input: InviteMemberInput): Promise<TenantInvite> {
    if (this.currentTenantId && input.tenantId !== this.currentTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot invite to other tenants" })
    }

    const existingInvite = await this.invitesRepo.findByTenantAndEmail(input.tenantId, input.email)

    if (existingInvite) {
      throw new TRPCError({ code: "CONFLICT", message: "Invite already exists for this email" })
    }

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    return this.invitesRepo.create({
      tenantId: input.tenantId,
      email: input.email,
      role: input.role ?? "member",
      token: generateInviteToken(),
      expiresAt,
    })
  }

  async removeMember(userId: string, tenantId: string, targetUserId: string): Promise<{ success: boolean }> {
    if (this.currentTenantId && tenantId !== this.currentTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot remove from other tenants" })
    }

    if (targetUserId === userId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove yourself" })
    }

    const deleted = await this.membersRepo.delete(tenantId, targetUserId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" })
    }

    return { success: true }
  }

  async updateMemberRole(input: UpdateMemberRoleInput): Promise<TenantMember> {
    if (this.currentTenantId && input.tenantId !== this.currentTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot update other tenants" })
    }

    const member = await this.membersRepo.updateRole(input.tenantId, input.userId, input.role)

    if (!member) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" })
    }

    return member
  }

  async listMembers(input: ListMembersInput): Promise<{ items: TenantMember[] }> {
    if (this.currentTenantId && input.tenantId !== this.currentTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot list other tenants" })
    }

    const items = await this.membersRepo.list(input.tenantId, {
      limit: input.limit,
      offset: input.offset,
    })

    return { items }
  }

  async acceptInvite(userId: string, token: string): Promise<TenantMember> {
    const invite = await this.invitesRepo.findByToken(token)

    if (!invite) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired invite" })
    }

    const existingMember = await this.membersRepo.findByTenantAndUser(invite.tenantId, userId)

    if (existingMember) {
      throw new TRPCError({ code: "CONFLICT", message: "Already a member of this tenant" })
    }

    const member = await this.membersRepo.create({
      tenantId: invite.tenantId,
      userId,
      role: invite.role,
      invitedAt: invite.createdAt,
      joinedAt: new Date(),
    })

    await this.invitesRepo.deleteById(invite.id)

    return member
  }

  async cancelInvite(inviteId: string): Promise<{ success: boolean }> {
    if (!this.currentTenantId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Tenant context required" })
    }

    const deleted = await this.invitesRepo.deleteByIdAndTenant(inviteId, this.currentTenantId)

    if (!deleted) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found" })
    }

    return { success: true }
  }

  async listInvites(tenantId: string): Promise<{ items: TenantInvite[] }> {
    if (this.currentTenantId && tenantId !== this.currentTenantId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cannot list other tenants" })
    }

    const items = await this.invitesRepo.findByTenant(tenantId)

    return { items }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Switch Tenant
  // ─────────────────────────────────────────────────────────────────────────────

  async switchTenant(userId: string, tenantId: string): Promise<{ tenant: Tenant; role: string }> {
    const member = await this.membersRepo.findByTenantAndUser(tenantId, userId)

    if (!member) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this tenant" })
    }

    const tenant = await this.tenantsRepo.findById(tenantId)

    if (!tenant) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Tenant not found" })
    }

    return { tenant, role: member.role }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { MultitenantService }
export type {
  CreateTenantInput,
  UpdateTenantInput,
  ListTenantsInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  ListMembersInput,
}
