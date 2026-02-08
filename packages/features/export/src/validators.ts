// ═══════════════════════════════════════════════════════════════════════════════
// Export Feature - Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Export Job Status
// ─────────────────────────────────────────────────────────────────────────────

export const exportJobStatus = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
])

export const exportFormat = z.enum([
  "pdf",
  "csv",
])

// ─────────────────────────────────────────────────────────────────────────────
// Create Export Job
// ─────────────────────────────────────────────────────────────────────────────

export const createExportJobInput = z.object({
  type: z.string().min(1).max(100),
  format: exportFormat,
  filters: z.record(z.unknown()).optional(),
})

export const createExportJobOutput = z.object({
  id: z.string().uuid(),
  status: exportJobStatus,
  createdAt: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Get Export Job
// ─────────────────────────────────────────────────────────────────────────────

export const getExportJobInput = z.object({
  jobId: z.string().uuid(),
})

export const getExportJobOutput = z.object({
  id: z.string().uuid(),
  type: z.string(),
  status: exportJobStatus,
  format: exportFormat,
  filters: z.record(z.unknown()).nullable(),
  fileUrl: z.string().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
})

// ─────────────────────────────────────────────────────────────────────────────
// List Export Jobs
// ─────────────────────────────────────────────────────────────────────────────

export const listExportJobsInput = z.object({
  type: z.string().optional(),
  status: exportJobStatus.optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

export const listExportJobsOutput = z.object({
  jobs: z.array(getExportJobOutput),
  total: z.number(),
  hasMore: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExportJobStatus = z.infer<typeof exportJobStatus>
export type ExportFormat = z.infer<typeof exportFormat>
export type CreateExportJobInput = z.infer<typeof createExportJobInput>
export type CreateExportJobOutput = z.infer<typeof createExportJobOutput>
export type GetExportJobInput = z.infer<typeof getExportJobInput>
export type GetExportJobOutput = z.infer<typeof getExportJobOutput>
export type ListExportJobsInput = z.infer<typeof listExportJobsInput>
export type ListExportJobsOutput = z.infer<typeof listExportJobsOutput>
