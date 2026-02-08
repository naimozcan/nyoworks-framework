// ═══════════════════════════════════════════════════════════════════════════════
// Notes Repository
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { eq, desc, sql } from "drizzle-orm"
import { notes, type Note, type NewNote } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface NoteListOptions {
  contactId: string
  limit: number
  offset: number
}

export interface NoteListResult {
  items: Note[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class NotesRepository {
  constructor(private readonly db: DrizzleDatabase) {}

  async create(data: Omit<NewNote, "id" | "createdAt" | "updatedAt">): Promise<Note> {
    const [result] = await this.db
      .insert(notes)
      .values(data)
      .returning()

    return result!
  }

  async findById(id: string): Promise<Note | null> {
    const result = await this.db
      .select()
      .from(notes)
      .where(eq(notes.id, id))
      .limit(1)

    return result[0] ?? null
  }

  async update(id: string, data: Partial<Omit<Note, "id" | "contactId" | "authorId" | "createdAt">>): Promise<Note | null> {
    const [result] = await this.db
      .update(notes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(notes.id, id))
      .returning()

    return result ?? null
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db
      .delete(notes)
      .where(eq(notes.id, id))
      .returning()

    return result.length > 0
  }

  async listByContact(options: NoteListOptions): Promise<NoteListResult> {
    const { contactId, limit, offset } = options

    const items = await this.db
      .select()
      .from(notes)
      .where(eq(notes.contactId, contactId))
      .orderBy(desc(notes.isPinned), desc(notes.createdAt))
      .limit(limit)
      .offset(offset)

    return { items }
  }

  async countByContact(contactId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(notes)
      .where(eq(notes.contactId, contactId))

    return Number(result[0]?.count ?? 0)
  }
}
