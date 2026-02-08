// ═══════════════════════════════════════════════════════════════════════════════
// Files Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, and, like, desc, sql } from "drizzle-orm"
import { files, type StorageFile, type NewStorageFile } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListOptions {
  limit: number
  offset: number
  bucket?: string
  mimeType?: string
  prefix?: string
}

export interface ListResult {
  items: StorageFile[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class FilesRepository {
  constructor(
    private readonly db: DrizzleDatabase,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewStorageFile, "id" | "createdAt" | "tenantId">): Promise<StorageFile> {
    const [result] = await this.db
      .insert(files)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result!
  }

  async findById(id: string): Promise<StorageFile | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async findByKey(key: string): Promise<StorageFile | null> {
    const result = await this.db
      .select()
      .from(files)
      .where(and(eq(files.key, key), eq(files.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async list(options: ListOptions): Promise<ListResult> {
    const { limit, offset } = options

    const conditions = [eq(files.tenantId, this.tenantId)]

    if (options.bucket) {
      conditions.push(eq(files.bucket, options.bucket))
    }

    if (options.mimeType) {
      conditions.push(like(files.mimeType, `${options.mimeType}%`))
    }

    if (options.prefix) {
      conditions.push(like(files.key, `${options.prefix}%`))
    }

    const items = await this.db.select().from(files).where(and(...conditions)).orderBy(desc(files.createdAt)).limit(limit).offset(offset)

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.tenantId, this.tenantId))

    const total = Number(countResult[0]?.count ?? 0)

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(files)
      .where(and(eq(files.id, id), eq(files.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async deleteByKey(key: string): Promise<boolean> {
    const result = await this.db
      .delete(files)
      .where(and(eq(files.key, key), eq(files.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async updateMetadata(id: string, metadata: Record<string, unknown>): Promise<StorageFile | null> {
    const [result] = await this.db
      .update(files)
      .set({ metadata })
      .where(and(eq(files.id, id), eq(files.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async setPublic(id: string, isPublic: boolean): Promise<StorageFile | null> {
    const [result] = await this.db
      .update(files)
      .set({ isPublic })
      .where(and(eq(files.id, id), eq(files.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async getTotalSize(): Promise<number> {
    const result = await this.db
      .select({ total: sql<number>`coalesce(sum(size), 0)` })
      .from(files)
      .where(eq(files.tenantId, this.tenantId))

    return Number(result[0]?.total ?? 0)
  }

  async count(): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.tenantId, this.tenantId))

    return Number(result[0]?.count ?? 0)
  }
}
