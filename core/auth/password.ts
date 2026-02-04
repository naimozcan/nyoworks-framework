// ═══════════════════════════════════════════════════════════════════════════════
// Password Hashing - Argon2id
// ═══════════════════════════════════════════════════════════════════════════════

import { hash, verify } from "@node-rs/argon2"

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const ARGON2_OPTIONS = {
  memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || "65536", 10),
  timeCost: parseInt(process.env.ARGON2_TIME_COST || "3", 10),
  parallelism: parseInt(process.env.ARGON2_PARALLELISM || "4", 10),
  outputLen: parseInt(process.env.ARGON2_OUTPUT_LEN || "32", 10),
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash Password
// ─────────────────────────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS)
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify Password
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyPassword(
  hashedPassword: string,
  plainPassword: string
): Promise<boolean> {
  try {
    return await verify(hashedPassword, plainPassword)
  } catch {
    return false
  }
}
