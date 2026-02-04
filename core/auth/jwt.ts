// ═══════════════════════════════════════════════════════════════════════════════
// JWT Token Management - jose
// ═══════════════════════════════════════════════════════════════════════════════

import { SignJWT, jwtVerify, type JWTPayload } from "jose"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)
const JWT_REFRESH_SECRET = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET)

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m"
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d"
const JWT_ALGORITHM = "HS256" as const

// ─────────────────────────────────────────────────────────────────────────────
// Payload Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  sub: string
  tid: string
  role: string
  permissions: string[]
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string
  tid: string
  jti: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Access Token
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAccessToken(
  payload: Omit<AccessTokenPayload, "iat" | "exp">
): Promise<string> {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required")
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Refresh Token
// ─────────────────────────────────────────────────────────────────────────────

export async function generateRefreshToken(
  payload: Omit<RefreshTokenPayload, "iat" | "exp">
): Promise<string> {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET environment variable is required")
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_REFRESH_SECRET)
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify Access Token
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as AccessTokenPayload
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify Refresh Token
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_REFRESH_SECRET)
  return payload as RefreshTokenPayload
}
