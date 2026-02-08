// ═══════════════════════════════════════════════════════════════════════════════
// Storage Service
// ═══════════════════════════════════════════════════════════════════════════════

import type { DrizzleDatabase } from "@nyoworks/database"
import { TRPCError } from "@trpc/server"
import { STORAGE } from "@nyoworks/shared"
import { FilesRepository, type ListOptions } from "../repositories/index.js"
import type { StorageFile } from "../schema.js"
import {
  createPresignedUploadUrl,
  createPresignedDownloadUrl,
  deleteObject,
  headObject,
  buildPublicUrl,
  generateKey,
  getBucket,
} from "../s3.js"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RequestUploadInput {
  userId: string
  filename: string
  mimeType: string
  size: number
  isPublic?: boolean
  metadata?: Record<string, unknown>
  folder?: string
}

export interface RequestUploadResult {
  fileId: string
  presignedUrl: string
  key: string
  expiresIn: number
}

export interface ConfirmUploadResult {
  file: FileOutput
}

export interface FileOutput {
  id: string
  key: string
  filename: string
  mimeType: string
  size: number
  url: string
  thumbnailUrl: string | null
  isPublic: boolean
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export interface GetPresignedUrlResult {
  url: string
  expiresIn: number
}

export interface ListFilesInput {
  folder?: string
  mimeType?: string
  isPublic?: boolean
  limit: number
  offset: number
  sortBy: "createdAt" | "filename" | "size"
  sortOrder: "asc" | "desc"
}

export interface ListFilesResult {
  files: FileOutput[]
  total: number
  hasMore: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function mapToFileOutput(file: StorageFile): FileOutput {
  return {
    id: file.id,
    key: file.key,
    filename: file.filename,
    mimeType: file.mimeType,
    size: file.size,
    url: file.url,
    thumbnailUrl: file.thumbnailUrl,
    isPublic: file.isPublic,
    metadata: file.metadata,
    createdAt: file.createdAt,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class StorageService {
  private readonly repository: FilesRepository

  constructor(
    db: DrizzleDatabase,
    private readonly tenantId: string
  ) {
    this.repository = new FilesRepository(db, tenantId)
  }

  async requestUpload(input: RequestUploadInput): Promise<RequestUploadResult> {
    const key = generateKey(this.tenantId, input.userId, input.filename, input.folder)
    const bucket = getBucket()
    const url = buildPublicUrl(key)

    const presignedUrl = await createPresignedUploadUrl(key, input.mimeType, STORAGE.PRESIGNED_URL_DEFAULT_EXPIRY)

    const file = await this.repository.create({
      userId: input.userId,
      key,
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      bucket,
      url,
      isPublic: input.isPublic ?? false,
      metadata: input.metadata,
    })

    return {
      fileId: file.id,
      presignedUrl,
      key,
      expiresIn: STORAGE.PRESIGNED_URL_DEFAULT_EXPIRY,
    }
  }

  async confirmUpload(fileId: string, userId: string): Promise<ConfirmUploadResult> {
    const file = await this.repository.findById(fileId)

    if (!file) {
      throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
    }

    if (file.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to access this file" })
    }

    const objectInfo = await headObject(file.key)
    if (!objectInfo) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "File not uploaded to storage" })
    }

    return {
      file: {
        ...mapToFileOutput(file),
        size: objectInfo.contentLength,
      },
    }
  }

  async getPresignedUrl(fileId: string, expiresIn: number): Promise<GetPresignedUrlResult> {
    const file = await this.repository.findById(fileId)

    if (!file) {
      throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
    }

    if (file.isPublic) {
      return {
        url: file.url,
        expiresIn: 0,
      }
    }

    const url = await createPresignedDownloadUrl(file.key, expiresIn)
    return {
      url,
      expiresIn,
    }
  }

  async getFile(fileId: string): Promise<FileOutput> {
    const file = await this.repository.findById(fileId)

    if (!file) {
      throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
    }

    return mapToFileOutput(file)
  }

  async deleteFile(fileId: string, userId: string): Promise<{ success: boolean }> {
    const file = await this.repository.findById(fileId)

    if (!file) {
      throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
    }

    if (file.userId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Not authorized to delete this file" })
    }

    await deleteObject(file.key)
    await this.repository.delete(fileId)

    return { success: true }
  }

  async listFiles(input: ListFilesInput): Promise<ListFilesResult> {
    const options: ListOptions = {
      limit: input.limit + 1,
      offset: input.offset,
      mimeType: input.mimeType,
      prefix: input.folder,
    }

    const result = await this.repository.list(options)

    const hasMore = result.items.length > input.limit
    const files = hasMore ? result.items.slice(0, input.limit) : result.items

    return {
      files: files.map(mapToFileOutput),
      total: result.total,
      hasMore,
    }
  }

  async updateMetadata(fileId: string, metadata: Record<string, unknown>): Promise<FileOutput> {
    const file = await this.repository.updateMetadata(fileId, metadata)

    if (!file) {
      throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
    }

    return mapToFileOutput(file)
  }

  async setPublic(fileId: string, isPublic: boolean): Promise<FileOutput> {
    const file = await this.repository.setPublic(fileId, isPublic)

    if (!file) {
      throw new TRPCError({ code: "NOT_FOUND", message: "File not found" })
    }

    return mapToFileOutput(file)
  }

  async getTotalSize(): Promise<number> {
    return this.repository.getTotalSize()
  }

  async getFileCount(): Promise<number> {
    return this.repository.count()
  }
}
