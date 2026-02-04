// ═══════════════════════════════════════════════════════════════════════════════
// Cache Key Builders
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Key Prefixes
// ─────────────────────────────────────────────────────────────────────────────

const PREFIX = process.env.CACHE_PREFIX || "nyoworks"

export const CachePrefix = {
  SESSION: `${PREFIX}:session`,
  USER: `${PREFIX}:user`,
  TENANT: `${PREFIX}:tenant`,
  ROLE: `${PREFIX}:role`,
  RATE_LIMIT: `${PREFIX}:ratelimit`,
  LOCK: `${PREFIX}:lock`,
  FEATURE: `${PREFIX}:feature`,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Key Builders
// ─────────────────────────────────────────────────────────────────────────────

export const CacheKey = {
  session: (tokenHash: string) => `${CachePrefix.SESSION}:${tokenHash}`,

  user: (userId: string) => `${CachePrefix.USER}:${userId}`,
  userByEmail: (tenantId: string, email: string) => `${CachePrefix.USER}:${tenantId}:email:${email}`,

  tenant: (tenantId: string) => `${CachePrefix.TENANT}:${tenantId}`,
  tenantBySlug: (slug: string) => `${CachePrefix.TENANT}:slug:${slug}`,
  tenantByDomain: (domain: string) => `${CachePrefix.TENANT}:domain:${domain}`,

  role: (roleId: string) => `${CachePrefix.ROLE}:${roleId}`,
  rolesByTenant: (tenantId: string) => `${CachePrefix.ROLE}:tenant:${tenantId}`,

  rateLimit: (identifier: string, window: string) => `${CachePrefix.RATE_LIMIT}:${identifier}:${window}`,

  lock: (resource: string) => `${CachePrefix.LOCK}:${resource}`,

  feature: (tenantId: string, featureId: string) => `${CachePrefix.FEATURE}:${tenantId}:${featureId}`,
  featuresByTenant: (tenantId: string) => `${CachePrefix.FEATURE}:${tenantId}:all`,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// TTL Configuration (seconds)
// ─────────────────────────────────────────────────────────────────────────────

export const CacheTTL = {
  SESSION: 60 * 60 * 24 * 7,      // 7 days
  USER: 60 * 15,                   // 15 minutes
  TENANT: 60 * 60,                 // 1 hour
  ROLE: 60 * 60,                   // 1 hour
  RATE_LIMIT_WINDOW: 60,           // 1 minute
  LOCK: 60 * 5,                    // 5 minutes
  FEATURE: 60 * 60 * 24,           // 24 hours
} as const

export type CacheTTLKey = keyof typeof CacheTTL
