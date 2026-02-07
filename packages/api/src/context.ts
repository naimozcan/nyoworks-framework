// ═══════════════════════════════════════════════════════════════════════════════
// tRPC Context
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  id: string
  email: string
  name: string
  role: string
}

export interface Context {
  user: User | null
  tenantId: string | null
  requestId: string
}

export interface CreateContextOptions {
  authorization: string | null
  tenantId: string | null
  requestId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Creator
// ─────────────────────────────────────────────────────────────────────────────

export async function createContext(
  opts: CreateContextOptions
): Promise<Context> {
  const { authorization, tenantId, requestId } = opts

  let user: User | null = null

  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.slice(7)
    user = await verifyToken(token)
  }

  return {
    user,
    tenantId,
    requestId,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Verification (placeholder - replace with actual implementation)
// ─────────────────────────────────────────────────────────────────────────────

async function verifyToken(_token: string): Promise<User | null> {
  try {
    return null
  } catch {
    return null
  }
}
