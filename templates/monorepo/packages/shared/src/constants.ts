// ═══════════════════════════════════════════════════════════════════════════════
// Shared Constants
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Status Codes
// ─────────────────────────────────────────────────────────────────────────────

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Error Codes
// ─────────────────────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Token Expiry
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 15 * 60 * 1000,
  REFRESH_TOKEN: 7 * 24 * 60 * 60 * 1000,
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  AUTH: { requests: 5, window: 60 },
  API: { requests: 100, window: 60 },
  UPLOAD: { requests: 10, window: 60 },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// File Upload
// ─────────────────────────────────────────────────────────────────────────────

export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf", "application/msword"],
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Workflow
// ─────────────────────────────────────────────────────────────────────────────

export const WORKFLOW_PHASES = [
  "DISCOVERY",
  "ARCHITECTURE",
  "PLANNING",
  "BACKEND",
  "FRONTEND",
  "QA",
  "DEPLOYMENT",
] as const

export const AGENT_ROLES = [
  "lead",
  "architect",
  "backend",
  "frontend",
  "data",
  "qa",
  "devops",
] as const

export const TASK_LOCK_TIMEOUT = 30 * 60 * 1000

// ─────────────────────────────────────────────────────────────────────────────
// Features
// ─────────────────────────────────────────────────────────────────────────────

export const AVAILABLE_FEATURES = [
  "payments",
  "appointments",
  "inventory",
  "crm",
  "cms",
  "ecommerce",
  "analytics",
  "notifications",
  "audit",
  "export",
  "realtime",
] as const

export const CORE_MODULES = [
  "auth",
  "multi-tenancy",
  "rbac",
  "i18n",
  "theme",
] as const
