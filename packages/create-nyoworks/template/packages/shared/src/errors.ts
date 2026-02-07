// ═══════════════════════════════════════════════════════════════════════════════
// Custom Error Classes
// ═══════════════════════════════════════════════════════════════════════════════

import { ERROR_CODES, HTTP_STATUS } from "./constants.js"

// ─────────────────────────────────────────────────────────────────────────────
// Base Error
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly details?: Record<string, unknown>

  constructor(
    message: string,
    code: string = ERROR_CODES.INTERNAL_ERROR,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = true
    this.details = details
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Error
// ─────────────────────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ERROR_CODES.VALIDATION_ERROR, HTTP_STATUS.BAD_REQUEST, details)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Error
// ─────────────────────────────────────────────────────────────────────────────

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, ERROR_CODES.AUTHENTICATION_ERROR, HTTP_STATUS.UNAUTHORIZED)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Authorization Error
// ─────────────────────────────────────────────────────────────────────────────

export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, ERROR_CODES.AUTHORIZATION_ERROR, HTTP_STATUS.FORBIDDEN)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Not Found Error
// ─────────────────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, ERROR_CODES.NOT_FOUND_ERROR, HTTP_STATUS.NOT_FOUND)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Conflict Error
// ─────────────────────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, ERROR_CODES.CONFLICT_ERROR, HTTP_STATUS.CONFLICT)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limit Error
// ─────────────────────────────────────────────────────────────────────────────

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      "Too many requests",
      ERROR_CODES.RATE_LIMIT_ERROR,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      retryAfter ? { retryAfter } : undefined
    )
  }
}
