// ═══════════════════════════════════════════════════════════════════════════════
// Storage Feature - S3 Client
// ═══════════════════════════════════════════════════════════════════════════════

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// ─────────────────────────────────────────────────────────────────────────────
// S3 Client
// ─────────────────────────────────────────────────────────────────────────────

let s3Client: S3Client | null = null

export interface S3Config {
  endpoint?: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  bucket: string
  publicUrl?: string
}

export function getS3Client(): S3Client {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT
    const region = process.env.S3_REGION || process.env.AWS_REGION
    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY

    if (!region) {
      throw new Error("S3_REGION or AWS_REGION environment variable is not set")
    }
    if (!accessKeyId) {
      throw new Error("S3_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID environment variable is not set")
    }
    if (!secretAccessKey) {
      throw new Error("S3_SECRET_ACCESS_KEY or AWS_SECRET_ACCESS_KEY environment variable is not set")
    }

    s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: !!endpoint,
    })
  }
  return s3Client
}

export function getBucket(): string {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error("S3_BUCKET environment variable is not set")
  }
  return bucket
}

export function getPublicUrl(): string | undefined {
  return process.env.S3_PUBLIC_URL
}

// ─────────────────────────────────────────────────────────────────────────────
// Presigned URLs
// ─────────────────────────────────────────────────────────────────────────────

export async function createPresignedUploadUrl(
  key: string,
  mimeType: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client()
  const bucket = getBucket()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: mimeType,
  })

  return getSignedUrl(client, command, { expiresIn })
}

export async function createPresignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const client = getS3Client()
  const bucket = getBucket()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  return getSignedUrl(client, command, { expiresIn })
}

// ─────────────────────────────────────────────────────────────────────────────
// File Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteObject(key: string): Promise<void> {
  const client = getS3Client()
  const bucket = getBucket()

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await client.send(command)
}

export async function headObject(key: string): Promise<{ contentLength: number; contentType: string } | null> {
  const client = getS3Client()
  const bucket = getBucket()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const response = await client.send(command)
    return {
      contentLength: response.ContentLength || 0,
      contentType: response.ContentType || "application/octet-stream",
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// URL Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function buildPublicUrl(key: string): string {
  const publicUrl = getPublicUrl()
  const bucket = getBucket()
  const endpoint = process.env.S3_ENDPOINT

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`
  }

  if (endpoint) {
    return `${endpoint.replace(/\/$/, "")}/${bucket}/${key}`
  }

  const region = process.env.S3_REGION || process.env.AWS_REGION || "us-east-1"
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

export function generateKey(tenantId: string, userId: string, filename: string, folder?: string): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_")
  const basePath = folder ? `${folder}/` : ""
  return `${tenantId}/${userId}/${basePath}${timestamp}-${randomSuffix}-${sanitizedFilename}`
}
