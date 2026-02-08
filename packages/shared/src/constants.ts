// ═══════════════════════════════════════════════════════════════════════════════
// Shared Constants
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// API Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const API_VERSION = "v1"
export const API_BASE_PATH = "/api"

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    VERIFY_EMAIL: "/auth/verify-email",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
  },
  USERS: {
    LIST: "/users",
    GET: "/users/:id",
    CREATE: "/users",
    UPDATE: "/users/:id",
    DELETE: "/users/:id",
    ME: "/users/me",
  },
  HEALTH: "/health",
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH = {
  ACCESS_TOKEN_EXPIRY: 15 * 60,
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiting
// ─────────────────────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  GLOBAL: { requests: 1000, window: 60 },
  AUTH: { requests: 10, window: 60 },
  API: { requests: 100, window: 60 },
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
  AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
  NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
  CONFLICT_ERROR: "CONFLICT_ERROR",
  RATE_LIMIT_ERROR: "RATE_LIMIT_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Timeouts (in milliseconds)
// ─────────────────────────────────────────────────────────────────────────────

export const TIMEOUTS = {
  SESSION_TIMEOUT: 30 * 60 * 1000,
  STALE_TIME: 5 * 60 * 1000,
  PRESENCE_STALE: 5 * 60 * 1000,
  RATE_LIMIT_WINDOW: 60 * 1000,
  LOCKOUT_DURATION_MS: AUTH.LOCKOUT_DURATION * 1000,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Storage Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE = {
  PRESIGNED_URL_DEFAULT_EXPIRY: 3600,
  PRESIGNED_URL_MIN_EXPIRY: 60,
  PRESIGNED_URL_MAX_EXPIRY: 604800,
  MAX_PAYLOAD_SIZE: 1024 * 1024,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Feature Defaults
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULTS = {
  SEARCH_LIMIT: 10,
  SUGGEST_LIMIT: 5,
  SUGGEST_DEBOUNCE_MS: 200,
  HISTORY_LIMIT: 100,
  APPOINTMENT_SLOT_MINUTES: 15,
  INVOICE_LIMIT: 10,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Storage Keys
// ─────────────────────────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  ANALYTICS_SESSION: "nyoworks_analytics_session",
  OAUTH_STATE: "nyoworks_oauth_state",
  LOCALE: "nyoworks_locale",
  THEME: "nyoworks_theme",
} as const
