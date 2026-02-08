// ═══════════════════════════════════════════════════════════════════════════════
// Database Client
// ═══════════════════════════════════════════════════════════════════════════════

import { drizzle } from "drizzle-orm/postgres-js"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Database Type
// ─────────────────────────────────────────────────────────────────────────────

export type DrizzleDatabase = PostgresJsDatabase<typeof schema>

// ─────────────────────────────────────────────────────────────────────────────
// Connection
// ─────────────────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

const client = postgres(connectionString, {
  max: Number(process.env.DB_POOL_MAX) || 20,
  idle_timeout: Number(process.env.DB_IDLE_TIMEOUT) || 20,
  connect_timeout: Number(process.env.DB_CONNECT_TIMEOUT) || 10,
})

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle Instance
// ─────────────────────────────────────────────────────────────────────────────

export const db = drizzle(client, { schema })

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
