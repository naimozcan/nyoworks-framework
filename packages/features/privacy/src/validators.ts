// ═══════════════════════════════════════════════════════════════════════════════
// Privacy Feature - Zod Validators (GDPR/AVG Compliance)
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from "zod"

// ─────────────────────────────────────────────────────────────────────────────
// Consent Validators
// ─────────────────────────────────────────────────────────────────────────────

export const consentTypeSchema = z.enum([
  "necessary",
  "functional",
  "analytics",
  "marketing",
  "personalization",
])

export const consentStatusSchema = z.enum([
  "granted",
  "denied",
  "pending",
  "withdrawn",
])

export const recordConsentSchema = z.object({
  consents: z.array(z.object({
    type: consentTypeSchema,
    status: consentStatusSchema,
  })),
  visitorId: z.string().optional(),
  policyVersion: z.string(),
  source: z.string().default("cookie_banner"),
})

export const updateConsentSchema = z.object({
  consentType: consentTypeSchema,
  status: consentStatusSchema,
})

export const withdrawConsentSchema = z.object({
  consentType: consentTypeSchema,
})

export const getConsentStatusSchema = z.object({
  visitorId: z.string().optional(),
  userId: z.string().uuid().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Management Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createCookieCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  description: z.record(z.string(), z.string()),
  isRequired: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})

export const updateCookieCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.record(z.string(), z.string()).optional(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export const createCookieDefinitionSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  description: z.record(z.string(), z.string()).optional(),
  provider: z.string().optional(),
  duration: z.string().optional(),
  type: z.string().default("cookie"),
  isFirstParty: z.boolean().default(true),
})

// ─────────────────────────────────────────────────────────────────────────────
// DSAR (Data Subject Access Request) Validators
// ─────────────────────────────────────────────────────────────────────────────

export const dsarTypeSchema = z.enum([
  "access",
  "rectification",
  "erasure",
  "portability",
  "restriction",
  "objection",
])

export const dsarStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "rejected",
  "expired",
])

export const submitDsarSchema = z.object({
  requestType: dsarTypeSchema,
  email: z.string().email(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  description: z.string().max(2000).optional(),
})

export const verifyDsarSchema = z.object({
  requestId: z.string().uuid(),
  token: z.string(),
})

export const updateDsarStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: dsarStatusSchema,
  responseNotes: z.string().max(2000).optional(),
  rejectionReason: z.string().max(500).optional(),
})

export const assignDsarSchema = z.object({
  requestId: z.string().uuid(),
  assigneeId: z.string().uuid(),
})

export const listDsarSchema = z.object({
  status: dsarStatusSchema.optional(),
  requestType: dsarTypeSchema.optional(),
  assignedTo: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// ─────────────────────────────────────────────────────────────────────────────
// Data Retention Validators
// ─────────────────────────────────────────────────────────────────────────────

export const retentionPolicyTypeSchema = z.enum([
  "time_based",
  "event_based",
  "indefinite",
])

export const createRetentionPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tableName: z.string().min(1).max(100),
  policyType: retentionPolicyTypeSchema,
  retentionDays: z.number().int().min(1).optional(),
  triggerEvent: z.string().optional(),
  deleteAction: z.enum(["soft_delete", "hard_delete", "anonymize"]).default("soft_delete"),
  anonymizeFields: z.array(z.string()).optional(),
})

export const updateRetentionPolicySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  retentionDays: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  anonymizeFields: z.array(z.string()).optional(),
})

export const runRetentionPolicySchema = z.object({
  policyId: z.string().uuid(),
  dryRun: z.boolean().default(true),
})

// ─────────────────────────────────────────────────────────────────────────────
// Processing Activities Validators
// ─────────────────────────────────────────────────────────────────────────────

export const legalBasisSchema = z.enum([
  "consent",
  "contract",
  "legal_obligation",
  "vital_interests",
  "public_task",
  "legitimate_interests",
])

export const thirdCountryTransferSchema = z.object({
  country: z.string().min(2).max(100),
  safeguard: z.enum(["adequacy_decision", "standard_clauses", "bcr", "derogation"]),
  description: z.string().optional(),
})

export const createProcessingActivitySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  purpose: z.string().min(1).max(500),
  legalBasis: legalBasisSchema,
  dataCategories: z.array(z.string()),
  dataSubjects: z.array(z.string()),
  recipients: z.array(z.string()).optional(),
  thirdCountryTransfers: z.array(thirdCountryTransferSchema).optional(),
  retentionPeriod: z.string().optional(),
  securityMeasures: z.array(z.string()).optional(),
  dpiaConducted: z.boolean().default(false),
  dpiaUrl: z.string().url().optional(),
})

export const updateProcessingActivitySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  purpose: z.string().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Privacy Policy Validators
// ─────────────────────────────────────────────────────────────────────────────

export const createPolicyVersionSchema = z.object({
  version: z.string().min(1).max(20),
  effectiveDate: z.date(),
  content: z.record(z.string(), z.string()),
  changelog: z.string().max(2000).optional(),
})

export const publishPolicyVersionSchema = z.object({
  id: z.string().uuid(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Data Breach Validators
// ─────────────────────────────────────────────────────────────────────────────

export const riskLevelSchema = z.enum(["low", "medium", "high", "critical", "unknown"])

export const reportDataBreachSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  discoveredAt: z.date(),
  affectedDataTypes: z.array(z.string()),
  affectedUserCount: z.number().int().min(0).optional(),
  riskLevel: riskLevelSchema,
  measures: z.array(z.string()).optional(),
})

export const updateDataBreachSchema = z.object({
  id: z.string().uuid(),
  reportedToAuthorityAt: z.date().optional(),
  notifiedUsers: z.boolean().optional(),
  resolution: z.string().max(2000).optional(),
  resolvedAt: z.date().optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Data Export Validators
// ─────────────────────────────────────────────────────────────────────────────

export const requestDataExportSchema = z.object({
  format: z.enum(["json", "csv", "pdf"]).default("json"),
  includeCategories: z.array(z.string()).optional(),
})

export const deleteUserDataSchema = z.object({
  userId: z.string().uuid(),
  confirmEmail: z.string().email(),
  reason: z.string().max(500).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

export type ConsentType = z.infer<typeof consentTypeSchema>
export type ConsentStatus = z.infer<typeof consentStatusSchema>
export type DsarType = z.infer<typeof dsarTypeSchema>
export type DsarStatus = z.infer<typeof dsarStatusSchema>
export type RetentionPolicyType = z.infer<typeof retentionPolicyTypeSchema>
export type LegalBasis = z.infer<typeof legalBasisSchema>
export type RiskLevel = z.infer<typeof riskLevelSchema>
export type RecordConsentInput = z.infer<typeof recordConsentSchema>
export type SubmitDsarInput = z.infer<typeof submitDsarSchema>
export type CreateRetentionPolicyInput = z.infer<typeof createRetentionPolicySchema>
export type CreateProcessingActivityInput = z.infer<typeof createProcessingActivitySchema>
export type ReportDataBreachInput = z.infer<typeof reportDataBreachSchema>
