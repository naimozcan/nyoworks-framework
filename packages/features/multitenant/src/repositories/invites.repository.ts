// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Invites Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, gt } from "drizzle-orm"
import { tenantInvites, type TenantInvite, type NewTenantInvite } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

class InvitesRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewTenantInvite, "id" | "createdAt">): Promise<TenantInvite> {
    const [result] = await this.db
      .insert(tenantInvites)
      .values(data)
      .returning()

    return result!
  }

  async findByToken(token: string): Promise<TenantInvite | null> {
    const result = await this.db
      .select()
      .from(tenantInvites)
      .where(and(eq(tenantInvites.token, token), gt(tenantInvites.expiresAt, new Date())))
      .limit(1)

    return result[0] ?? null
  }

  async findByTenantAndEmail(tenantId: string, email: string): Promise<TenantInvite | null> {
    const result = await this.db
      .select()
      .from(tenantInvites)
      .where(
        and(
          eq(tenantInvites.tenantId, tenantId),
          eq(tenantInvites.email, email),
          gt(tenantInvites.expiresAt, new Date())
        )
      )
      .limit(1)

    return result[0] ?? null
  }

  async findByTenant(tenantId: string): Promise<TenantInvite[]> {
    return this.db
      .select()
      .from(tenantInvites)
      .where(and(eq(tenantInvites.tenantId, tenantId), gt(tenantInvites.expiresAt, new Date())))
  }

  async deleteById(id: string): Promise<TenantInvite | null> {
    const [result] = await this.db
      .delete(tenantInvites)
      .where(eq(tenantInvites.id, id))
      .returning()

    return result ?? null
  }

  async deleteByIdAndTenant(id: string, tenantId: string): Promise<TenantInvite | null> {
    const [result] = await this.db
      .delete(tenantInvites)
      .where(and(eq(tenantInvites.id, id), eq(tenantInvites.tenantId, tenantId)))
      .returning()

    return result ?? null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { InvitesRepository }
