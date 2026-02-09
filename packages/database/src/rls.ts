// ═══════════════════════════════════════════════════════════════════════════════
// Database - Row Level Security (RLS) Utilities
// ═══════════════════════════════════════════════════════════════════════════════

import type postgres from "postgres"
import { sql } from "drizzle-orm"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface RLSContext {
  tenantId: string
  appId: string
  userId?: string
}

interface RLSPolicyOptions {
  tableName: string
  policyName?: string
  tenantColumn?: string
  appColumn?: string
  allowSuperuser?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Context Management
// ─────────────────────────────────────────────────────────────────────────────

async function setRLSContext(
  client: postgres.Sql,
  context: RLSContext
): Promise<void> {
  await client`SELECT set_config('app.current_tenant_id', ${context.tenantId}, true)`
  await client`SELECT set_config('app.current_app_id', ${context.appId}, true)`
  if (context.userId) {
    await client`SELECT set_config('app.current_user_id', ${context.userId}, true)`
  }
}

async function clearRLSContext(client: postgres.Sql): Promise<void> {
  await client`SELECT set_config('app.current_tenant_id', '', true)`
  await client`SELECT set_config('app.current_app_id', '', true)`
  await client`SELECT set_config('app.current_user_id', '', true)`
}

async function withRLSContext<T>(
  client: postgres.Sql,
  context: RLSContext,
  callback: () => Promise<T>
): Promise<T> {
  await setRLSContext(client, context)
  try {
    return await callback()
  } finally {
    await clearRLSContext(client)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RLS Policy Generation SQL
// ─────────────────────────────────────────────────────────────────────────────

function generateEnableRLS(tableName: string): string {
  return `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`
}

function generateForceRLS(tableName: string): string {
  return `ALTER TABLE ${tableName} FORCE ROW LEVEL SECURITY;`
}

function generateTenantPolicy(options: RLSPolicyOptions): string {
  const {
    tableName,
    policyName = `${tableName}_tenant_isolation`,
    tenantColumn = "tenant_id",
  } = options

  return `
CREATE POLICY ${policyName} ON ${tableName}
  FOR ALL
  USING (${tenantColumn}::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (${tenantColumn}::text = current_setting('app.current_tenant_id', true));
`
}

function generateAppScopedPolicy(options: RLSPolicyOptions): string {
  const {
    tableName,
    policyName = `${tableName}_app_isolation`,
    tenantColumn = "tenant_id",
    appColumn = "app_id",
  } = options

  return `
CREATE POLICY ${policyName} ON ${tableName}
  FOR ALL
  USING (
    ${tenantColumn}::text = current_setting('app.current_tenant_id', true)
    AND ${appColumn}::text = current_setting('app.current_app_id', true)
  )
  WITH CHECK (
    ${tenantColumn}::text = current_setting('app.current_tenant_id', true)
    AND ${appColumn}::text = current_setting('app.current_app_id', true)
  );
`
}

function generateBypassPolicy(tableName: string, roleName: string = "superadmin"): string {
  return `
CREATE POLICY ${tableName}_superadmin_bypass ON ${tableName}
  FOR ALL
  TO ${roleName}
  USING (true)
  WITH CHECK (true);
`
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration Helper
// ─────────────────────────────────────────────────────────────────────────────

interface RLSMigration {
  up: string
  down: string
}

function generateRLSMigration(
  tableName: string,
  options: {
    appScoped?: boolean
    tenantColumn?: string
    appColumn?: string
  } = {}
): RLSMigration {
  const { appScoped = false, tenantColumn = "tenant_id", appColumn = "app_id" } = options

  const enableRLS = generateEnableRLS(tableName)
  const forceRLS = generateForceRLS(tableName)

  const policy = appScoped
    ? generateAppScopedPolicy({ tableName, tenantColumn, appColumn })
    : generateTenantPolicy({ tableName, tenantColumn })

  const up = `
-- Enable RLS on ${tableName}
${enableRLS}
${forceRLS}

-- Create isolation policy
${policy}
`

  const down = `
-- Drop policy
DROP POLICY IF EXISTS ${tableName}_${appScoped ? "app" : "tenant"}_isolation ON ${tableName};

-- Disable RLS
ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;
`

  return { up, down }
}

// ─────────────────────────────────────────────────────────────────────────────
// App-Scoped Tables Registry
// ─────────────────────────────────────────────────────────────────────────────

const APP_SCOPED_TABLES = {
  ecommerce: ["products", "orders", "order_items", "carts", "categories", "reviews"],
  crm: ["contacts", "deals", "activities", "pipelines", "stages"],
  salon: ["appointments", "services", "providers", "availability", "time_slots"],
  booking: ["appointments", "services", "providers", "availability"],
  hr: ["employees", "payroll", "leaves", "departments", "positions"],
  erp: ["accounts", "invoices", "transactions", "ledger_entries"],
  wms: ["inventory", "locations", "stock_movements", "shipments"],
  cms: ["posts", "pages", "media", "categories", "tags"],
  tms: ["vehicles", "routes", "deliveries", "drivers", "trips"],
}

const SHARED_TABLES = [
  "users",
  "tenants",
  "sessions",
  "refresh_tokens",
  "audit_logs",
  "files",
  "notifications",
  "notification_settings",
]

function getTablesForApp(appId: string): string[] {
  const appTables = APP_SCOPED_TABLES[appId as keyof typeof APP_SCOPED_TABLES] || []
  return appTables
}

function isAppScopedTable(tableName: string): boolean {
  const allAppTables = Object.values(APP_SCOPED_TABLES).flat()
  return allAppTables.includes(tableName)
}

function isSharedTable(tableName: string): boolean {
  return SHARED_TABLES.includes(tableName)
}

// ─────────────────────────────────────────────────────────────────────────────
// Drizzle SQL Helpers
// ─────────────────────────────────────────────────────────────────────────────

const currentTenantId = sql`current_setting('app.current_tenant_id', true)::uuid`
const currentAppId = sql`current_setting('app.current_app_id', true)`
const currentUserId = sql`current_setting('app.current_user_id', true)::uuid`

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  setRLSContext,
  clearRLSContext,
  withRLSContext,
  generateEnableRLS,
  generateForceRLS,
  generateTenantPolicy,
  generateAppScopedPolicy,
  generateBypassPolicy,
  generateRLSMigration,
  getTablesForApp,
  isAppScopedTable,
  isSharedTable,
  currentTenantId,
  currentAppId,
  currentUserId,
  APP_SCOPED_TABLES,
  SHARED_TABLES,
}

export type { RLSContext, RLSPolicyOptions, RLSMigration }
