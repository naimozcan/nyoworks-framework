// ═══════════════════════════════════════════════════════════════════════════════
// Privacy Feature - Database Schema (GDPR/AVG Compliance)
// ═══════════════════════════════════════════════════════════════════════════════

import { pgTable, uuid, text, timestamp, boolean, jsonb, index, pgEnum, integer } from "drizzle-orm/pg-core"

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const consentTypeEnum = pgEnum("consent_type", [
  "necessary",
  "functional",
  "analytics",
  "marketing",
  "personalization",
])

export const consentStatusEnum = pgEnum("consent_status", [
  "granted",
  "denied",
  "pending",
  "withdrawn",
])

export const dsarTypeEnum = pgEnum("dsar_type", [
  "access",
  "rectification",
  "erasure",
  "portability",
  "restriction",
  "objection",
])

export const dsarStatusEnum = pgEnum("dsar_status", [
  "pending",
  "in_progress",
  "completed",
  "rejected",
  "expired",
])

export const retentionPolicyTypeEnum = pgEnum("retention_policy_type", [
  "time_based",
  "event_based",
  "indefinite",
])

// ─────────────────────────────────────────────────────────────────────────────
// Consent Records Table
// ─────────────────────────────────────────────────────────────────────────────

export const consentRecords = pgTable("consent_records", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"),
  visitorId: text("visitor_id"),
  consentType: consentTypeEnum("consent_type").notNull(),
  status: consentStatusEnum("status").notNull().default("pending"),
  version: text("version").notNull(),
  policyUrl: text("policy_url"),
  source: text("source").notNull().default("cookie_banner"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("consent_tenant_idx").on(table.tenantId),
  index("consent_user_idx").on(table.userId),
  index("consent_visitor_idx").on(table.visitorId),
  index("consent_type_idx").on(table.consentType),
  index("consent_status_idx").on(table.status),
])

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Categories Table
// ─────────────────────────────────────────────────────────────────────────────

export const cookieCategories = pgTable("cookie_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: jsonb("description").$type<Record<string, string>>(),
  isRequired: boolean("is_required").notNull().default(false),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("cookie_cat_tenant_idx").on(table.tenantId),
  index("cookie_cat_slug_idx").on(table.slug),
])

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Definitions Table
// ─────────────────────────────────────────────────────────────────────────────

export const cookieDefinitions = pgTable("cookie_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  categoryId: uuid("category_id").notNull().references(() => cookieCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain"),
  description: jsonb("description").$type<Record<string, string>>(),
  provider: text("provider"),
  duration: text("duration"),
  type: text("type").notNull().default("cookie"),
  isFirstParty: boolean("is_first_party").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("cookie_def_tenant_idx").on(table.tenantId),
  index("cookie_def_category_idx").on(table.categoryId),
])

// ─────────────────────────────────────────────────────────────────────────────
// Data Subject Access Requests (DSAR) Table
// ─────────────────────────────────────────────────────────────────────────────

export const dataSubjectRequests = pgTable("data_subject_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"),
  requestType: dsarTypeEnum("request_type").notNull(),
  status: dsarStatusEnum("status").notNull().default("pending"),
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  verificationToken: text("verification_token"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  description: text("description"),
  responseNotes: text("response_notes"),
  dataExportUrl: text("data_export_url"),
  dataExportExpiresAt: timestamp("data_export_expires_at", { withTimezone: true }),
  assignedTo: uuid("assigned_to"),
  deadline: timestamp("deadline", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  rejectionReason: text("rejection_reason"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("dsar_tenant_idx").on(table.tenantId),
  index("dsar_user_idx").on(table.userId),
  index("dsar_email_idx").on(table.email),
  index("dsar_status_idx").on(table.status),
  index("dsar_type_idx").on(table.requestType),
])

// ─────────────────────────────────────────────────────────────────────────────
// Data Retention Policies Table
// ─────────────────────────────────────────────────────────────────────────────

export const retentionPolicies = pgTable("retention_policies", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  tableName: text("table_name").notNull(),
  policyType: retentionPolicyTypeEnum("policy_type").notNull(),
  retentionDays: integer("retention_days"),
  triggerEvent: text("trigger_event"),
  deleteAction: text("delete_action").notNull().default("soft_delete"),
  anonymizeFields: jsonb("anonymize_fields").$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("retention_tenant_idx").on(table.tenantId),
  index("retention_table_idx").on(table.tableName),
  index("retention_active_idx").on(table.isActive),
])

// ─────────────────────────────────────────────────────────────────────────────
// Data Processing Activities Table (ROPA - Record of Processing Activities)
// ─────────────────────────────────────────────────────────────────────────────

export const processingActivities = pgTable("processing_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  purpose: text("purpose").notNull(),
  legalBasis: text("legal_basis").notNull(),
  dataCategories: jsonb("data_categories").$type<string[]>(),
  dataSubjects: jsonb("data_subjects").$type<string[]>(),
  recipients: jsonb("recipients").$type<string[]>(),
  thirdCountryTransfers: jsonb("third_country_transfers").$type<ThirdCountryTransfer[]>(),
  retentionPeriod: text("retention_period"),
  securityMeasures: jsonb("security_measures").$type<string[]>(),
  dpiaConducted: boolean("dpia_conducted").notNull().default(false),
  dpiaUrl: text("dpia_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("processing_tenant_idx").on(table.tenantId),
  index("processing_active_idx").on(table.isActive),
])

// ─────────────────────────────────────────────────────────────────────────────
// Privacy Policy Versions Table
// ─────────────────────────────────────────────────────────────────────────────

export const privacyPolicyVersions = pgTable("privacy_policy_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  version: text("version").notNull(),
  effectiveDate: timestamp("effective_date", { withTimezone: true }).notNull(),
  content: jsonb("content").$type<Record<string, string>>(),
  contentUrl: text("content_url"),
  changelog: text("changelog"),
  isActive: boolean("is_active").notNull().default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  publishedBy: uuid("published_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("policy_tenant_idx").on(table.tenantId),
  index("policy_version_idx").on(table.version),
  index("policy_active_idx").on(table.isActive),
])

// ─────────────────────────────────────────────────────────────────────────────
// Data Breach Records Table
// ─────────────────────────────────────────────────────────────────────────────

export const dataBreaches = pgTable("data_breaches", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull(),
  reportedToAuthorityAt: timestamp("reported_to_authority_at", { withTimezone: true }),
  affectedDataTypes: jsonb("affected_data_types").$type<string[]>(),
  affectedUserCount: integer("affected_user_count"),
  riskLevel: text("risk_level").notNull().default("unknown"),
  measures: jsonb("measures").$type<string[]>(),
  notifiedUsers: boolean("notified_users").notNull().default(false),
  notifiedUsersAt: timestamp("notified_users_at", { withTimezone: true }),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("breach_tenant_idx").on(table.tenantId),
  index("breach_discovered_idx").on(table.discoveredAt),
])

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ThirdCountryTransfer {
  country: string
  safeguard: string
  description?: string
}

export type ConsentRecord = typeof consentRecords.$inferSelect
export type NewConsentRecord = typeof consentRecords.$inferInsert
export type CookieCategory = typeof cookieCategories.$inferSelect
export type NewCookieCategory = typeof cookieCategories.$inferInsert
export type CookieDefinition = typeof cookieDefinitions.$inferSelect
export type DataSubjectRequest = typeof dataSubjectRequests.$inferSelect
export type NewDataSubjectRequest = typeof dataSubjectRequests.$inferInsert
export type RetentionPolicy = typeof retentionPolicies.$inferSelect
export type ProcessingActivity = typeof processingActivities.$inferSelect
export type PrivacyPolicyVersion = typeof privacyPolicyVersions.$inferSelect
export type DataBreach = typeof dataBreaches.$inferSelect
