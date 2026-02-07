// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Phase Validation
// ═══════════════════════════════════════════════════════════════════════════════

import { existsSync } from "fs"
import { execSync } from "child_process"
import { join } from "path"
import { getProjectRoot, getState, loadState } from "./state.js"

function runPhaseValidation(check: string): { check: string; passed: boolean; message: string } {
  const cwd = getProjectRoot()

  switch (check) {
    case "config_exists":
      return {
        check,
        passed: existsSync(join(cwd, "nyoworks.config.yaml")),
        message: "nyoworks.config.yaml must exist",
      }
    case "vision_documented":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "product")),
        message: "Vision documentation required",
      }
    case "schema_exists":
      return {
        check,
        passed: existsSync(join(cwd, "packages", "database", "src", "db", "schema")),
        message: "Database schema must exist",
      }
    case "api_documented":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "api", "endpoints.md")),
        message: "API routes must be documented",
      }
    case "ui_specs_exist":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "ui")),
        message: "UI specifications required",
      }
    case "user_flows_documented":
      return {
        check,
        passed: existsSync(join(cwd, "docs", "bible", "ui", "page-specs.md")),
        message: "User flows must be documented",
      }
    case "tasks_created": {
      loadState()
      const state = getState()
      return {
        check,
        passed: state.tasks.length > 0,
        message: "Tasks must be created in state",
      }
    }
    case "api_tests_pass": {
      try {
        execSync("pnpm --filter api test --reporter json", { cwd, encoding: "utf-8", timeout: 120000, stdio: "pipe" })
        return { check, passed: true, message: "API tests pass" }
      } catch (err) {
        const output = (err as { stdout?: string }).stdout || ""
        const failCount = (output.match(/failed/gi) || []).length
        return { check, passed: false, message: `API tests failed (${failCount} failures)` }
      }
    }
    case "api_coverage_80": {
      try {
        const output = execSync("pnpm --filter api test --coverage", { cwd, encoding: "utf-8", timeout: 120000, stdio: "pipe" })
        const coverageMatch = output.match(/All files\s*\|\s*([\d.]+)/)
        const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : 0
        return { check, passed: coverage >= 80, message: `Coverage: ${coverage}% (threshold: 80%)` }
      } catch {
        return { check, passed: false, message: "Coverage check failed to run" }
      }
    }
    case "build_success": {
      try {
        execSync("pnpm --filter web build", { cwd, encoding: "utf-8", timeout: 180000, stdio: "pipe" })
        return { check, passed: true, message: "Web build succeeded" }
      } catch {
        return { check, passed: false, message: "Web build failed" }
      }
    }
    case "i18n_complete":
      return {
        check,
        passed: existsSync(join(cwd, "apps", "web", "messages")),
        message: "i18n messages must exist",
      }
    case "e2e_tests_pass": {
      try {
        execSync("pnpm --filter web test:e2e", { cwd, encoding: "utf-8", timeout: 300000, stdio: "pipe" })
        return { check, passed: true, message: "E2E tests pass" }
      } catch {
        return { check, passed: false, message: "E2E tests failed" }
      }
    }
    case "security_scan_pass":
    case "staging_health_check":
    case "production_health_check":
    case "monitoring_active": {
      loadState()
      const state = getState()
      if (!state.manualApprovals) state.manualApprovals = {}
      const approval = state.manualApprovals[check]
      if (approval) {
        return { check, passed: true, message: `Approved by ${approval.approvedBy} on ${approval.approvedAt}: ${approval.notes}` }
      }
      return { check, passed: false, message: `Manual approval required. Use approve_check tool with check="${check}"` }
    }
    default:
      return {
        check,
        passed: false,
        message: `Unknown check: ${check}`,
      }
  }
}

export { runPhaseValidation }
