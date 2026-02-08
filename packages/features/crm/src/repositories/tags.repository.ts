// ═══════════════════════════════════════════════════════════════════════════════
// Tags Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, asc, sql } from "drizzle-orm"
import { tags, type Tag, type NewTag } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class TagsRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewTag, "id" | "createdAt" | "tenantId">): Promise<Tag> {
    const db = this.db as any
    const [result] = await db
      .insert(tags)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<Tag | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, id), eq(tags.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Tag, "id" | "tenantId" | "createdAt">>): Promise<Tag | null> {
    const db = this.db as any
    const [result] = await db
      .update(tags)
      .set(data)
      .where(and(eq(tags.id, id), eq(tags.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(): Promise<Tag[]> {
    const db = this.db as any
    return db
      .select()
      .from(tags)
      .where(eq(tags.tenantId, this.tenantId))
      .orderBy(asc(tags.name))
  }

  async count(): Promise<number> {
    const db = this.db as any
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(tags)
      .where(eq(tags.tenantId, this.tenantId))

    return result[0]?.count ?? 0
  }
}
