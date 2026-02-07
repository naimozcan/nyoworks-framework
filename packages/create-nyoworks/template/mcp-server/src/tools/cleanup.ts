// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Cleanup & Approval Tools
// ═══════════════════════════════════════════════════════════════════════════════

import { existsSync, readdirSync } from "fs"
import { execSync } from "child_process"
import { join } from "path"
import type { ToolHandler, ToolDefinition } from "../types.js"
import { getProjectRoot, getState, loadState, saveState } from "../state.js"

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  check_orphan_code: () => {
    const cwd = getProjectRoot()
    const orphans: { type: string; path: string; reason: string }[] = []

    const ALLOWED_ROOT_FILES = [
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "tsconfig.json",
      "tsconfig.base.json",
      "tsconfig.tsbuildinfo",
      "turbo.json",
      ".gitignore",
      ".npmrc",
      ".nvmrc",
      ".env",
      ".env.example",
      ".env.local",
      ".prettierrc",
      ".prettierrc.json",
      ".prettierignore",
      ".eslintrc.js",
      ".eslintrc.cjs",
      "eslint.config.js",
      "eslint.config.mjs",
      "vitest.config.ts",
      "playwright.config.ts",
      "docker-compose.yml",
      "docker-compose.yaml",
      "Dockerfile",
      "Makefile",
      "README.md",
      "LICENSE",
      "CHANGELOG.md",
      "nyoworks.config.yaml",
      "CLAUDE.md",
      ".claude.json",
      ".mcp.json",
      "components.json",
    ]

    const ALLOWED_ROOT_DIRS = [
      "node_modules",
      ".git",
      ".github",
      ".vscode",
      ".idea",
      ".nyoworks",
      ".claude",
      "apps",
      "packages",
      "docs",
      "scripts",
      "docker",
      "infra",
      "mcp-server",
      "src",
      "workflow",
      "_tools",
      ".next",
      ".turbo",
      "dist",
      "coverage",
    ]

    try {
      const rootItems = readdirSync(cwd, { withFileTypes: true })

      for (const item of rootItems) {
        if (item.isFile()) {
          const isAllowed = ALLOWED_ROOT_FILES.some((f) => item.name === f || item.name.startsWith(".env"))
          if (!isAllowed) {
            orphans.push({
              type: "file",
              path: item.name,
              reason: "Unexpected file in project root",
            })
          }
        } else if (item.isDirectory()) {
          if (!ALLOWED_ROOT_DIRS.includes(item.name)) {
            orphans.push({
              type: "directory",
              path: item.name,
              reason: "Unexpected directory in project root",
            })
          }
        }
      }

      const gitExists = existsSync(join(cwd, ".git"))
      if (gitExists) {
        try {
          const untracked = execSync("git ls-files --others --exclude-standard", { cwd, encoding: "utf-8" })
          const untrackedFiles = untracked.split("\n").filter((f: string) => f.trim())
          for (const file of untrackedFiles) {
            if (!file.startsWith("node_modules/") && !file.startsWith(".")) {
              const isRootFile = !file.includes("/")
              if (isRootFile && !ALLOWED_ROOT_FILES.includes(file)) {
                orphans.push({
                  type: "untracked",
                  path: file,
                  reason: "Untracked file in root (forgot to commit or should be deleted)",
                })
              }
            }
          }
        } catch {}
      }
    } catch (err) {
      return { success: false, error: String(err) }
    }

    return {
      success: true,
      clean: orphans.length === 0,
      orphanCount: orphans.length,
      orphans,
      recommendation: orphans.length > 0
        ? "Clean up orphan files: delete if unnecessary, move to appropriate location, or add to .gitignore"
        : "Project root is clean",
    }
  },

  approve_check: ({ check, approvedBy, notes }) => {
    loadState()
    const state = getState()

    if (!state.manualApprovals) state.manualApprovals = {}

    state.manualApprovals[check as string] = {
      approvedBy: approvedBy as string,
      approvedAt: new Date().toISOString(),
      notes: notes as string,
    }
    saveState()

    return { success: true, check, approvedBy, message: `Check "${check}" approved by ${approvedBy}` }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "check_orphan_code",
    description: "Check for orphan files/directories in project root. MUST be called after completing any task to ensure no garbage files were left behind.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "approve_check",
    description: "Manually approve a validation check that cannot be automated (security scan, staging health, etc.)",
    inputSchema: {
      type: "object" as const,
      properties: {
        check: { type: "string", description: "Check name (e.g., security_scan_pass)" },
        approvedBy: { type: "string", description: "Role approving (e.g., qa, lead)" },
        notes: { type: "string", description: "Approval notes/evidence" },
      },
      required: ["check", "approvedBy", "notes"],
    },
  },
]

export { handlers, definitions }
