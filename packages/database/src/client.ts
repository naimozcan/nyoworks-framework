// ═══════════════════════════════════════════════════════════════════════════════
// Database Client
// ═══════════════════════════════════════════════════════════════════════════════

import { drizzle } from "drizzle-orm/postgres-js"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { getServerEnv } from "@nyoworks/shared"
import * as schema from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Database Type
// ─────────────────────────────────────────────────────────────────────────────

export type DrizzleDatabase = PostgresJsDatabase<typeof schema>

// ─────────────────────────────────────────────────────────────────────────────
// Connection
// ─────────────────────────────────────────────────────────────────────────────

const env = getServerEnv()

const client = postgres(env.DATABASE_URL, {
  max: env.DB_POOL_MAX,
  idle_timeout: env.DB_IDLE_TIMEOUT,
  connect_timeout: env.DB_CONNECT_TIMEOUT,
})

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle Instance
// ─────────────────────────────────────────────────────────────────────────────

export const db = drizzle(client, { schema })

// ─────────────────────────────────────────────────────────────────────────────
// Database Factory (for custom connection strings)
// ─────────────────────────────────────────────────────────────────────────────

export function createDatabase(url: string): DrizzleDatabase {
  const serverEnv = getServerEnv()
  const customClient = postgres(url, {
    max: serverEnv.DB_POOL_MAX,
    idle_timeout: serverEnv.DB_IDLE_TIMEOUT,
    connect_timeout: serverEnv.DB_CONNECT_TIMEOUT,
  })
  return drizzle(customClient, { schema })
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Context
// ─────────────────────────────────────────────────────────────────────────────

export async function withTenant<T>(
  tenantId: string,
  callback: () => Promise<T>
): Promise<T> {
  await client`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
  try {
    return await callback()
  } finally {
    await client`SELECT set_config('app.current_tenant_id', '', true)`
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export { sql, eq, and, or, isNull, desc, asc, inArray, notInArray } from "drizzle-orm"
