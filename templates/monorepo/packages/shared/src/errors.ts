// ═══════════════════════════════════════════════════════════════════════════════
// Application Errors
// ═══════════════════════════════════════════════════════════════════════════════

import { HTTP_STATUS, ERROR_CODES } from "./constants"

// ─────────────────────────────────────────────────────────────────────────────
// Base Application Error
// ─────────────────────────────────────────────────────────────────────────────

export class AppError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly details?: unknown

  constructor(code: string, message: string, statusCode: number, details?: unknown) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.statusCode = statusCode
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Specific Errors
// ─────────────────────────────────────────────────────────────────────────────

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(ERROR_CODES.VALIDATION_ERROR, message, HTTP_STATUS.BAD_REQUEST, details)
    this.name = "ValidationError"
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(ERROR_CODES.UNAUTHORIZED, message, HTTP_STATUS.UNAUTHORIZED)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied") {
    super(ERROR_CODES.FORBIDDEN, message, HTTP_STATUS.FORBIDDEN)
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(ERROR_CODES.NOT_FOUND, `${resource} not found`, HTTP_STATUS.NOT_FOUND)
    this.name = "NotFoundError"
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ERROR_CODES.CONFLICT, message, HTTP_STATUS.CONFLICT)
    this.name = "ConflictError"
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      ERROR_CODES.RATE_LIMITED,
      "Too many requests",
      HTTP_STATUS.TOO_MANY_REQUESTS,
      retryAfter ? { retryAfter } : undefined
    )
    this.name = "RateLimitError"
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Helper
// ─────────────────────────────────────────────────────────────────────────────

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      ERROR_CODES.INTERNAL_ERROR,
      error.message,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    )
  }

  return new AppError(
    ERROR_CODES.INTERNAL_ERROR,
    "An unexpected error occurred",
    HTTP_STATUS.INTERNAL_SERVER_ERROR
  )
}
