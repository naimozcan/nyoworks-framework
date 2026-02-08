// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Members Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and } from "drizzle-orm"
import { tenantMembers, type TenantMember, type NewTenantMember } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ListOptions {
  limit: number
  offset: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

class MembersRepository {
  constructor(private readonly db: unknown) {}

  async create(data: Omit<NewTenantMember, "id">): Promise<TenantMember> {
    const db = this.db as any

    const [result] = await db
      .insert(tenantMembers)
      .values(data)
      .returning()

    return result
  }

  async findByTenantAndUser(tenantId: string, userId: string): Promise<TenantMember | null> {
    const db = this.db as any

    const result = await db
      .select()
      .from(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
      .limit(1)

    return result[0] ?? null
  }

  async findByTenantUserAndRole(tenantId: string, userId: string, role: string): Promise<TenantMember | null> {
    const db = this.db as any

    const result = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, userId),
          eq(tenantMembers.role, role)
        )
      )
      .limit(1)

    return result[0] ?? null
  }

  async findByUser(userId: string): Promise<{ tenantId: string }[]> {
    const db = this.db as any

    return db
      .select({ tenantId: tenantMembers.tenantId })
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, userId))
  }

  async list(tenantId: string, options: ListOptions): Promise<TenantMember[]> {
    const { limit, offset } = options
    const db = this.db as any

    return db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenantId))
      .limit(limit)
      .offset(offset)
  }

  async updateRole(tenantId: string, userId: string, role: string): Promise<TenantMember | null> {
    const db = this.db as any

    const [result] = await db
      .update(tenantMembers)
      .set({ role })
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
      .returning()

    return result ?? null
  }

  async delete(tenantId: string, userId: string): Promise<TenantMember | null> {
    const db = this.db as any

    const [result] = await db
      .delete(tenantMembers)
      .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.userId, userId)))
      .returning()

    return result ?? null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { MembersRepository }
export type { ListOptions }
