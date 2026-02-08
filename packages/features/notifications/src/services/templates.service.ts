// ═══════════════════════════════════════════════════════════════════════════════
// Templates Service
// ═══════════════════════════════════════════════════════════════════════════════

import { TRPCError } from "@trpc/server"
import { TemplatesRepository } from "../repositories/index.js"
import { notificationTemplates } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type NotificationChannel = typeof notificationTemplates.$inferSelect["channel"]

interface CreateTemplateInput {
  name: string
  slug: string
  description?: string
  channel: NotificationChannel
  subject?: string
  body: string
  htmlBody?: string
  variables?: string[]
}

interface UpdateTemplateInput {
  name?: string
  description?: string
  subject?: string
  body?: string
  htmlBody?: string
  variables?: string[]
  isActive?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class TemplatesService {
  private readonly repository: TemplatesRepository

  constructor(db: unknown, tenantId: string) {
    this.repository = new TemplatesRepository(db, tenantId)
  }

  async create(input: CreateTemplateInput) {
    return this.repository.create({
      name: input.name,
      slug: input.slug,
      description: input.description,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      htmlBody: input.htmlBody,
      variables: input.variables,
    })
  }

  async get(templateId: string) {
    const template = await this.repository.findById(templateId)

    if (!template) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
    }

    return template
  }

  async getBySlug(slug: string, channel: NotificationChannel) {
    const template = await this.repository.findBySlug(slug, channel)

    if (!template) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
    }

    return template
  }

  async list() {
    return this.repository.list()
  }

  async listByChannel(channel: NotificationChannel) {
    return this.repository.listByChannel(channel)
  }

  async update(templateId: string, input: UpdateTemplateInput) {
    const template = await this.repository.update(templateId, input)

    if (!template) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
    }

    return template
  }

  async delete(templateId: string) {
    const success = await this.repository.delete(templateId)

    if (!success) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" })
    }

    return { success: true }
  }
}
