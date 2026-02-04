// ═══════════════════════════════════════════════════════════════════════════════
// Database Client - Drizzle ORM Setup
// ═══════════════════════════════════════════════════════════════════════════════

import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// ─────────────────────────────────────────────────────────────────────────────
// Connection
// ─────────────────────────────────────────────────────────────────────────────

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required")
}

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
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
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export { sql, eq, and, or, isNull, desc, asc } from "drizzle-orm"
export * from "./schema"
