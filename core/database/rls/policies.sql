-- ═══════════════════════════════════════════════════════════════════════════════
-- Row Level Security Policies
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- Enable RLS on all tenant-scoped tables
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- Create tenant context function
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- Users Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_tenant_id());

CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY users_insert_own_tenant ON users
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY users_update_own_tenant ON users
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY users_delete_own_tenant ON users
  FOR DELETE
  USING (tenant_id = current_tenant_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- Roles Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY roles_tenant_isolation ON roles
  FOR ALL
  USING (tenant_id = current_tenant_id());

CREATE POLICY roles_select_own ON roles
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY roles_insert_own_tenant ON roles
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY roles_update_own_tenant ON roles
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY roles_delete_own_tenant ON roles
  FOR DELETE
  USING (tenant_id = current_tenant_id() AND is_system = false);

-- ─────────────────────────────────────────────────────────────────────────────
-- Sessions Policies
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY sessions_user_isolation ON sessions
  FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE tenant_id = current_tenant_id()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Service Account Bypass (for migrations and admin tasks)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY service_account_bypass ON users
  FOR ALL
  TO service_account
  USING (true);

CREATE POLICY service_account_bypass ON roles
  FOR ALL
  TO service_account
  USING (true);

CREATE POLICY service_account_bypass ON sessions
  FOR ALL
  TO service_account
  USING (true);
