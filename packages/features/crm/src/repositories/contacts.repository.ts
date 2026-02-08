// ═══════════════════════════════════════════════════════════════════════════════
// Contacts Repository
// ═══════════════════════════════════════════════════════════════════════════════

import { eq, and, like, desc, asc, sql } from "drizzle-orm"
import { contacts, contactTags, type Contact, type NewContact } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ContactListOptions {
  limit: number
  offset: number
  search?: string
  status?: string
  tagId?: string
  sortBy?: "createdAt" | "firstName" | "lastName" | "company"
  sortOrder?: "asc" | "desc"
}

export interface ContactListResult {
  items: Contact[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class ContactsRepository {
  constructor(
    private readonly db: unknown,
    private readonly tenantId: string
  ) {}

  async create(data: Omit<NewContact, "id" | "createdAt" | "updatedAt" | "tenantId">): Promise<Contact> {
    const db = this.db as any
    const [result] = await db
      .insert(contacts)
      .values({
        ...data,
        tenantId: this.tenantId,
      })
      .returning()

    return result
  }

  async findById(id: string): Promise<Contact | null> {
    const db = this.db as any
    const result = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, this.tenantId)))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Contact, "id" | "tenantId" | "createdAt">>): Promise<Contact | null> {
    const db = this.db as any
    const [result] = await db
      .update(contacts)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, this.tenantId)))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db as any
    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, this.tenantId)))
      .returning()

    return result.length > 0
  }

  async list(options: ContactListOptions): Promise<ContactListResult> {
    const db = this.db as any
    const { limit, offset, sortBy = "createdAt", sortOrder = "desc" } = options

    let query = db.select().from(contacts).where(eq(contacts.tenantId, this.tenantId))

    if (options.search) {
      query = query.where(like(contacts.firstName, `%${options.search}%`))
    }

    if (options.status) {
      query = query.where(eq(contacts.status, options.status))
    }

    const sortColumns = {
      createdAt: contacts.createdAt,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      company: contacts.company,
    } as const
    const orderFn = sortOrder === "asc" ? asc : desc
    const sortColumn = sortColumns[sortBy] ?? contacts.createdAt
    query = query.orderBy(orderFn(sortColumn))

    const items = await query.limit(limit).offset(offset)

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(eq(contacts.tenantId, this.tenantId))

    const total = countResult[0]?.count ?? 0

    return {
      items,
      total,
      hasMore: offset + limit < total,
    }
  }

  async addTag(contactId: string, tagId: string): Promise<void> {
    const db = this.db as any
    await db.insert(contactTags).values({
      contactId,
      tagId,
    })
  }

  async removeTag(contactId: string, tagId: string): Promise<void> {
    const db = this.db as any
    await db
      .delete(contactTags)
      .where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId)))
  }

  async addTags(contactId: string, tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return

    const db = this.db as any
    await db.insert(contactTags).values(
      tagIds.map((tagId) => ({
        contactId,
        tagId,
      }))
    )
  }

  async count(): Promise<number> {
    const db = this.db as any
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(eq(contacts.tenantId, this.tenantId))

    return result[0]?.count ?? 0
  }
}
