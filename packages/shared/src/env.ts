// ═══════════════════════════════════════════════════════════════════════════════
// Environment Validation
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Server Environment Schema
// ─────────────────────────────────────────────────────────────────────────────

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL URL"),
  DB_POOL_MAX: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT: z.coerce.number().default(20),
  DB_CONNECT_TIMEOUT: z.coerce.number().default(10),

  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis URL").optional(),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRY: z.string().default("15m"),
  JWT_REFRESH_EXPIRY: z.string().default("7d"),

  API_URL: z.string().url().default("http://localhost:3001"),
  WEB_URL: z.string().url().optional(),
  MOBILE_URL: z.string().url().optional(),
  CORS_ORIGINS: z.string().transform(s => s ? s.split(",").map(o => o.trim()) : []).optional(),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Client Environment Schema
// ─────────────────────────────────────────────────────────────────────────────

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:3001"),
})

// ─────────────────────────────────────────────────────────────────────────────
// Feature Environment Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const stripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith("sk_"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_"),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
})

export const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),
  AWS_SES_REGION: z.string().optional(),
})

export const smsEnvSchema = z.object({
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
})

export const pushEnvSchema = z.object({
  FCM_SERVER_KEY: z.string().optional(),
})

export const oauthEnvSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
})

export const storageEnvSchema = z.object({
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_URL: z.string().url().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ServerEnv = z.infer<typeof serverEnvSchema>
export type ClientEnv = z.infer<typeof clientEnvSchema>
export type StripeEnv = z.infer<typeof stripeEnvSchema>
export type EmailEnv = z.infer<typeof emailEnvSchema>
export type SmsEnv = z.infer<typeof smsEnvSchema>
export type PushEnv = z.infer<typeof pushEnvSchema>
export type OAuthEnv = z.infer<typeof oauthEnvSchema>
export type StorageEnv = z.infer<typeof storageEnvSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Environment Cache
// ─────────────────────────────────────────────────────────────────────────────

let _serverEnv: ServerEnv | null = null
let _stripeEnv: StripeEnv | null = null
let _emailEnv: EmailEnv | null = null
let _smsEnv: SmsEnv | null = null
let _pushEnv: PushEnv | null = null
let _oauthEnv: OAuthEnv | null = null
let _storageEnv: StorageEnv | null = null

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

export function validateServerEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(env)

  if (!result.success) {
    const issues = result.error.issues
    const errors = issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n")

    throw new Error(`❌ Invalid environment variables:\n${errors}`)
  }

  return result.data
}

export function validateClientEnv(env: Record<string, string | undefined>): ClientEnv {
  const result = clientEnvSchema.safeParse(env)

  if (!result.success) {
    const issues = result.error.issues
    const errors = issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n")

    throw new Error(`❌ Invalid client environment variables:\n${errors}`)
  }

  return result.data
}

export function validateStripeEnv(env: NodeJS.ProcessEnv = process.env): StripeEnv | null {
  const result = stripeEnvSchema.safeParse(env)
  return result.success ? result.data : null
}

export function validateEmailEnv(env: NodeJS.ProcessEnv = process.env): EmailEnv | null {
  const result = emailEnvSchema.safeParse(env)
  return result.success ? result.data : null
}

export function validateStorageEnv(env: NodeJS.ProcessEnv = process.env): StorageEnv | null {
  const result = storageEnvSchema.safeParse(env)
  return result.success ? result.data : null
}

export function validateSmsEnv(env: NodeJS.ProcessEnv = process.env): SmsEnv | null {
  const result = smsEnvSchema.safeParse(env)
  return result.success ? result.data : null
}

export function validatePushEnv(env: NodeJS.ProcessEnv = process.env): PushEnv | null {
  const result = pushEnvSchema.safeParse(env)
  return result.success ? result.data : null
}

export function validateOAuthEnv(env: NodeJS.ProcessEnv = process.env): OAuthEnv | null {
  const result = oauthEnvSchema.safeParse(env)
  return result.success ? result.data : null
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Getters
// ─────────────────────────────────────────────────────────────────────────────

export function getServerEnv(): ServerEnv {
  if (!_serverEnv) {
    _serverEnv = validateServerEnv()
  }
  return _serverEnv
}

export function getStripeEnv(): StripeEnv | null {
  if (_stripeEnv === null) {
    _stripeEnv = validateStripeEnv()
  }
  return _stripeEnv
}

export function getEmailEnv(): EmailEnv | null {
  if (_emailEnv === null) {
    _emailEnv = validateEmailEnv()
  }
  return _emailEnv
}

export function getSmsEnv(): SmsEnv | null {
  if (_smsEnv === null) {
    _smsEnv = validateSmsEnv()
  }
  return _smsEnv
}

export function getPushEnv(): PushEnv | null {
  if (_pushEnv === null) {
    _pushEnv = validatePushEnv()
  }
  return _pushEnv
}

export function getOAuthEnv(): OAuthEnv | null {
  if (_oauthEnv === null) {
    _oauthEnv = validateOAuthEnv()
  }
  return _oauthEnv
}

export function getStorageEnv(): StorageEnv | null {
  if (_storageEnv === null) {
    _storageEnv = validateStorageEnv()
  }
  return _storageEnv
}

// ─────────────────────────────────────────────────────────────────────────────
// Development Check
// ─────────────────────────────────────────────────────────────────────────────

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development"
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production"
}

export function isTest(): boolean {
  return process.env.NODE_ENV === "test"
}
