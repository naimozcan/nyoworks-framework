// ═══════════════════════════════════════════════════════════════════════════════
// Export Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import { ExportRepository } from "../repositories/index.js"
import type { ExportJob } from "../schema.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CreateInput {
  userId: string
  type: string
  format: string
  filters?: Record<string, unknown>
}

interface ListInput {
  limit: number
  offset: number
  type?: string
  status?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class ExportService {
  private readonly repository: ExportRepository

  constructor(db: DrizzleDatabase, tenantId: string) {
    this.repository = new ExportRepository(db, tenantId)
  }

  async create(input: CreateInput): Promise<ExportJob> {
    return this.repository.create({
      userId: input.userId,
      type: input.type,
      format: input.format,
      filters: input.filters ?? null,
      status: "pending",
      fileUrl: null,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    })
  }

  async get(jobId: string): Promise<ExportJob> {
    const job = await this.repository.findById(jobId)

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export job not found" })
    }

    return job
  }

  async list(input: ListInput) {
    return this.repository.list(input)
  }

  async getUserJobs(userId: string, options?: { limit?: number; offset?: number }) {
    const items = await this.repository.findByUser(userId, options)
    return { items }
  }

  async startProcessing(jobId: string): Promise<ExportJob> {
    const job = await this.repository.update(jobId, {
      status: "processing",
      startedAt: new Date(),
    })

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export job not found" })
    }

    return job
  }

  async complete(jobId: string, fileUrl: string): Promise<ExportJob> {
    const job = await this.repository.update(jobId, {
      status: "completed",
      fileUrl,
      completedAt: new Date(),
    })

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export job not found" })
    }

    return job
  }

  async fail(jobId: string, errorMessage: string): Promise<ExportJob> {
    const job = await this.repository.update(jobId, {
      status: "failed",
      errorMessage,
      completedAt: new Date(),
    })

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export job not found" })
    }

    return job
  }

  async cancel(jobId: string): Promise<boolean> {
    const job = await this.repository.findById(jobId)

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export job not found" })
    }

    if (job.status === "completed" || job.status === "failed") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel completed or failed job" })
    }

    await this.repository.update(jobId, {
      status: "failed",
      errorMessage: "Cancelled by user",
      completedAt: new Date(),
    })

    return true
  }

  async getDownloadUrl(jobId: string): Promise<string> {
    const job = await this.repository.findById(jobId)

    if (!job) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export job not found" })
    }

    if (job.status !== "completed" || !job.fileUrl) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export job not completed or file not available" })
    }

    return job.fileUrl
  }

  async getStats() {
    const byStatus = await this.repository.countByStatus()
    const total = Object.values(byStatus).reduce((sum, count) => sum + count, 0)

    return {
      total,
      byStatus,
    }
  }
}
