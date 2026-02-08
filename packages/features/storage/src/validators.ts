// ═══════════════════════════════════════════════════════════════════════════════
// Storage Feature - Validators
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Upload File
// ─────────────────────────────────────────────────────────────────────────────

export const uploadFileInput = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  size: z.number().int().positive(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.unknown()).optional(),
  folder: z.string().max(512).optional(),
})

export const uploadFileOutput = z.object({
  fileId: z.string().uuid(),
  presignedUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Get Presigned URL
// ─────────────────────────────────────────────────────────────────────────────

export const getPresignedUrlInput = z.object({
  fileId: z.string().uuid(),
  expiresIn: z.number().int().min(60).max(604800).default(3600),
})

export const getPresignedUrlOutput = z.object({
  url: z.string().url(),
  expiresIn: z.number(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Delete File
// ─────────────────────────────────────────────────────────────────────────────

export const deleteFileInput = z.object({
  fileId: z.string().uuid(),
})

export const deleteFileOutput = z.object({
  success: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// List Files
// ─────────────────────────────────────────────────────────────────────────────

export const listFilesInput = z.object({
  folder: z.string().max(512).optional(),
  mimeType: z.string().max(127).optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(["createdAt", "filename", "size"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})

export const fileOutput = z.object({
  id: z.string().uuid(),
  key: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string(),
  thumbnailUrl: z.string().nullable(),
  isPublic: z.boolean(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
})

export const listFilesOutput = z.object({
  files: z.array(fileOutput),
  total: z.number(),
  hasMore: z.boolean(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Confirm Upload
// ─────────────────────────────────────────────────────────────────────────────

export const confirmUploadInput = z.object({
  fileId: z.string().uuid(),
})

export const confirmUploadOutput = z.object({
  file: fileOutput,
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UploadFileInput = z.infer<typeof uploadFileInput>
export type UploadFileOutput = z.infer<typeof uploadFileOutput>
export type GetPresignedUrlInput = z.infer<typeof getPresignedUrlInput>
export type GetPresignedUrlOutput = z.infer<typeof getPresignedUrlOutput>
export type DeleteFileInput = z.infer<typeof deleteFileInput>
export type DeleteFileOutput = z.infer<typeof deleteFileOutput>
export type ListFilesInput = z.infer<typeof listFilesInput>
export type FileOutput = z.infer<typeof fileOutput>
export type ListFilesOutput = z.infer<typeof listFilesOutput>
export type ConfirmUploadInput = z.infer<typeof confirmUploadInput>
export type ConfirmUploadOutput = z.infer<typeof confirmUploadOutput>
