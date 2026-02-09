// ═══════════════════════════════════════════════════════════════════════════════
// Authentication Utilities - jose + argon2
// ═══════════════════════════════════════════════════════════════════════════════

import * as jose from "jose"
import * as argon2 from "argon2"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string
  tenantId?: string
  role?: string
  email?: string
  iat?: number
  exp?: number
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthConfig {
  jwtSecret: string
  accessTokenExpiry?: string
  refreshTokenExpiry?: string
  issuer?: string
  audience?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_ACCESS_EXPIRY = "15m"
const DEFAULT_REFRESH_EXPIRY = "7d"
const DEFAULT_ISSUER = "nyoworks"
const DEFAULT_AUDIENCE = "nyoworks-app"

let authConfig: AuthConfig | null = null

export function configureAuth(config: AuthConfig): void {
  authConfig = {
    ...config,
    accessTokenExpiry: config.accessTokenExpiry || DEFAULT_ACCESS_EXPIRY,
    refreshTokenExpiry: config.refreshTokenExpiry || DEFAULT_REFRESH_EXPIRY,
    issuer: config.issuer || DEFAULT_ISSUER,
    audience: config.audience || DEFAULT_AUDIENCE,
  }
}

function getConfig(): AuthConfig {
  if (!authConfig) {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      throw new Error("JWT_SECRET not configured. Call configureAuth() or set JWT_SECRET env var")
    }
    authConfig = {
      jwtSecret,
      accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || DEFAULT_ACCESS_EXPIRY,
      refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || DEFAULT_REFRESH_EXPIRY,
      issuer: process.env.JWT_ISSUER || DEFAULT_ISSUER,
      audience: process.env.JWT_AUDIENCE || DEFAULT_AUDIENCE,
    }
  }
  return authConfig
}

function getSecretKey(): Uint8Array {
  const config = getConfig()
  return new TextEncoder().encode(config.jwtSecret)
}

// ─────────────────────────────────────────────────────────────────────────────
// Password Hashing (Argon2id)
// ─────────────────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  })
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export function isArgon2Hash(hash: string): boolean {
  return hash.startsWith("$argon2")
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT Token Generation
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAccessToken(payload: JWTPayload): Promise<string> {
  const config = getConfig()
  const secret = getSecretKey()

  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(config.issuer!)
    .setAudience(config.audience!)
    .setExpirationTime(config.accessTokenExpiry!)
    .setSubject(payload.sub)
    .sign(secret)
}

export async function generateRefreshToken(payload: Pick<JWTPayload, "sub">): Promise<string> {
  const config = getConfig()
  const secret = getSecretKey()

  return new jose.SignJWT({ sub: payload.sub, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(config.issuer!)
    .setAudience(config.audience!)
    .setExpirationTime(config.refreshTokenExpiry!)
    .setSubject(payload.sub)
    .sign(secret)
}

export async function generateTokenPair(payload: JWTPayload): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken({ sub: payload.sub }),
  ])

  return {
    accessToken,
    refreshToken,
    expiresIn: 900,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT Token Verification
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const config = getConfig()
    const secret = getSecretKey()

    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: config.issuer,
      audience: config.audience,
    })

    return {
      sub: payload.sub as string,
      tenantId: payload.tenantId as string | undefined,
      role: payload.role as string | undefined,
      email: payload.email as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string } | null> {
  try {
    const config = getConfig()
    const secret = getSecretKey()

    const { payload } = await jose.jwtVerify(token, secret, {
      issuer: config.issuer,
      audience: config.audience,
    })

    if (payload.type !== "refresh") {
      return null
    }

    return { sub: payload.sub as string }
  } catch {
    return null
  }
}

export async function decodeToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jose.decodeJwt(token)
    return {
      sub: decoded.sub as string,
      tenantId: decoded.tenantId as string | undefined,
      role: decoded.role as string | undefined,
      email: decoded.email as string | undefined,
      iat: decoded.iat,
      exp: decoded.exp,
    }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Refresh
// ─────────────────────────────────────────────────────────────────────────────

export async function refreshTokenPair(
  refreshToken: string,
  getUserPayload: (userId: string) => Promise<Omit<JWTPayload, "sub"> | null>
): Promise<TokenPair | null> {
  const verified = await verifyRefreshToken(refreshToken)
  if (!verified) {
    return null
  }

  const userPayload = await getUserPayload(verified.sub)
  if (!userPayload) {
    return null
  }

  return generateTokenPair({
    sub: verified.sub,
    ...userPayload,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Cookie Helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: "strict" | "lax" | "none"
  path: string
  maxAge: number
}

export function getAccessTokenCookieOptions(isProduction = true): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: 900,
  }
}

export function getRefreshTokenCookieOptions(isProduction = true): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: 604800,
  }
}

export function getClearCookieOptions(): Partial<CookieOptions> {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { jose }
