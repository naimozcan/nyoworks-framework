// ═══════════════════════════════════════════════════════════════════════════════
// Social Accounts Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and } from "drizzle-orm"
import { socialAccounts, type SocialAccount, type NewSocialAccount, type SocialProfile } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateTokensData {
  accessToken?: string
  refreshToken?: string | null
  expiresAt?: Date | null
  profile?: SocialProfile
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

class SocialAccountsRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewSocialAccount, "id" | "createdAt" | "updatedAt">): Promise<SocialAccount> {
    const [result] = await this.db
      .insert(socialAccounts)
      .values(data)
      .returning()

    return result!
  }

  async findByProviderAndAccountId(provider: string, providerAccountId: string): Promise<SocialAccount | null> {
    const result = await this.db
      .select()
      .from(socialAccounts)
      .where(
        and(
          eq(socialAccounts.provider, provider),
          eq(socialAccounts.providerAccountId, providerAccountId)
        )
      )
      .limit(1)

    return result[0] ?? null
  }

  async findByUserAndProvider(userId: string, provider: string): Promise<SocialAccount | null> {
    const result = await this.db
      .select()
      .from(socialAccounts)
      .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.provider, provider)))
      .limit(1)

    return result[0] ?? null
  }

  async findByUser(userId: string): Promise<SocialAccount[]> {
    return this.db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.userId, userId))
  }

  async findById(id: string): Promise<SocialAccount | null> {
    const result = await this.db
      .select()
      .from(socialAccounts)
      .where(eq(socialAccounts.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async updateTokens(id: string, data: UpdateTokensData): Promise<SocialAccount | null> {
    const [result] = await this.db
      .update(socialAccounts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(socialAccounts.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(socialAccounts)
      .where(eq(socialAccounts.id, id))
      .returning()

    return result.length > 0
  }

  async deleteByUserAndProvider(userId: string, provider: string): Promise<SocialAccount | null> {
    const [result] = await this.db
      .delete(socialAccounts)
      .where(and(eq(socialAccounts.userId, userId), eq(socialAccounts.provider, provider)))
      .returning()

    return result ?? null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { SocialAccountsRepository }
export type { UpdateTokensData }
