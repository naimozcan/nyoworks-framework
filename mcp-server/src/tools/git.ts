// ═══════════════════════════════════════════════════════════════════════════════
// Git Workflow Tools
// ═══════════════════════════════════════════════════════════════════════════════

import { execSync } from "child_process"
import { loadState, saveState, logActivity } from "../state.js"
import type { ToolDefinition, ToolHandler } from "../types.js"

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function runGit(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim()
  } catch (error) {
    const err = error as { stderr?: Buffer; message?: string }
    throw new Error(err.stderr?.toString() || err.message || "Git command failed")
  }
}

function getCurrentBranch(): string {
  return runGit("rev-parse --abbrev-ref HEAD")
}

function branchExists(branchName: string): boolean {
  try {
    runGit(`rev-parse --verify ${branchName}`)
    return true
  } catch {
    return false
  }
}

function validateBranchName(name: string): { valid: boolean; reason?: string } {
  const patterns = [
    { regex: /^feature\/TASK-\d+-[a-z0-9-]+$/, type: "feature" },
    { regex: /^fix\/TASK-\d+-[a-z0-9-]+$/, type: "fix" },
    { regex: /^hotfix\/TASK-\d+-[a-z0-9-]+$/, type: "hotfix" },
    { regex: /^release\/v\d+\.\d+\.\d+$/, type: "release" },
    { regex: /^(main|develop)$/, type: "protected" },
  ]

  for (const pattern of patterns) {
    if (pattern.regex.test(name)) {
      return { valid: true }
    }
  }

  return {
    valid: false,
    reason: `Invalid branch name. Use: feature/TASK-{id}-{description}, fix/TASK-{id}-{description}, hotfix/TASK-{id}-{description}, or release/v{x}.{y}.{z}`,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

export const gitToolDefinitions: ToolDefinition[] = [
  {
    name: "create_feature_branch",
    description: "Create a feature branch from develop for a task. Branch name follows convention: feature/TASK-{id}-{description}",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string", description: "Task ID (e.g., TASK-001)" },
        description: { type: "string", description: "Short description (lowercase, hyphens only)" },
        type: { type: "string", enum: ["feature", "fix", "hotfix"], description: "Branch type (default: feature)" },
      },
      required: ["taskId", "description"],
    },
  },
  {
    name: "merge_feature_branch",
    description: "Merge a feature branch back to develop (after task completion)",
    inputSchema: {
      type: "object",
      properties: {
        branchName: { type: "string", description: "Branch name to merge (or current if not specified)" },
        deleteBranch: { type: "boolean", description: "Delete branch after merge (default: true)" },
      },
    },
  },
  {
    name: "get_branch_status",
    description: "Get current Git branch status including uncommitted changes and ahead/behind counts",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "validate_branch_naming",
    description: "Validate if a branch name follows the convention",
    inputSchema: {
      type: "object",
      properties: {
        branchName: { type: "string", description: "Branch name to validate" },
      },
      required: ["branchName"],
    },
  },
  {
    name: "sync_branch_phase",
    description: "Ensure branch naming aligns with current workflow phase",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tool Handlers
// ─────────────────────────────────────────────────────────────────────────────

export const gitToolHandlers: Record<string, ToolHandler> = {
  create_feature_branch: (args) => {
    const { taskId, description, type = "feature" } = args as {
      taskId: string
      description: string
      type?: "feature" | "fix" | "hotfix"
    }

    const normalizedDesc = description.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    const branchName = `${type}/${taskId}-${normalizedDesc}`

    const validation = validateBranchName(branchName)
    if (!validation.valid) {
      return { success: false, error: validation.reason }
    }

    if (branchExists(branchName)) {
      return { success: false, error: `Branch ${branchName} already exists` }
    }

    const currentBranch = getCurrentBranch()

    if (currentBranch !== "develop") {
      runGit("checkout develop")
      runGit("pull origin develop")
    }

    runGit(`checkout -b ${branchName}`)

    logActivity("git", "create_feature_branch", `Created branch: ${branchName}`)

    return {
      success: true,
      branchName,
      message: `Created and switched to branch: ${branchName}`,
      previousBranch: currentBranch,
    }
  },

  merge_feature_branch: (args) => {
    const { branchName, deleteBranch = true } = args as {
      branchName?: string
      deleteBranch?: boolean
    }

    const currentBranch = branchName || getCurrentBranch()

    if (currentBranch === "main" || currentBranch === "develop") {
      return { success: false, error: `Cannot merge protected branch: ${currentBranch}` }
    }

    const hasUncommitted = runGit("status --porcelain")
    if (hasUncommitted) {
      return { success: false, error: "Uncommitted changes detected. Commit or stash before merging." }
    }

    runGit("checkout develop")
    runGit("pull origin develop")

    try {
      runGit(`merge --no-ff ${currentBranch} -m "Merge ${currentBranch} into develop"`)
    } catch (error) {
      return { success: false, error: `Merge conflict detected. Resolve manually.` }
    }

    if (deleteBranch) {
      runGit(`branch -d ${currentBranch}`)
    }

    logActivity("git", "merge_feature_branch", `Merged ${currentBranch} into develop`)

    return {
      success: true,
      mergedBranch: currentBranch,
      deletedBranch: deleteBranch,
      message: `Merged ${currentBranch} into develop${deleteBranch ? " and deleted branch" : ""}`,
    }
  },

  get_branch_status: () => {
    const currentBranch = getCurrentBranch()
    const status = runGit("status --porcelain")
    const uncommittedChanges = status ? status.split("\n").length : 0

    let aheadBehind = { ahead: 0, behind: 0 }
    try {
      const tracking = runGit(`rev-list --left-right --count ${currentBranch}...origin/${currentBranch}`)
      const [ahead, behind] = tracking.split("\t").map(Number)
      aheadBehind = { ahead: ahead || 0, behind: behind || 0 }
    } catch {
      aheadBehind = { ahead: 0, behind: 0 }
    }

    let lastCommit = ""
    try {
      lastCommit = runGit("log -1 --oneline")
    } catch {
      lastCommit = "No commits yet"
    }

    const state = loadState()

    return {
      currentBranch,
      uncommittedChanges,
      ahead: aheadBehind.ahead,
      behind: aheadBehind.behind,
      lastCommit,
      currentPhase: state.phase,
      hasUnpushedCommits: aheadBehind.ahead > 0,
      needsPull: aheadBehind.behind > 0,
    }
  },

  validate_branch_naming: (args) => {
    const { branchName } = args as { branchName: string }
    return validateBranchName(branchName)
  },

  sync_branch_phase: () => {
    const state = loadState()
    const currentBranch = getCurrentBranch()
    const phase = state.phase

    const phaseExpectedBranches: Record<string, string[]> = {
      DISCOVERY: ["main", "develop"],
      ARCHITECTURE: ["main", "develop"],
      DESIGN: ["main", "develop", "feature/*"],
      PLANNING: ["main", "develop"],
      BACKEND: ["feature/*", "fix/*"],
      FRONTEND: ["feature/*", "fix/*"],
      QA: ["feature/*", "fix/*", "develop"],
      DEPLOYMENT: ["main", "release/*", "hotfix/*"],
    }

    const expected = phaseExpectedBranches[phase] || ["develop"]
    const isOnExpectedBranch = expected.some((pattern) => {
      if (pattern.includes("*")) {
        const prefix = pattern.replace("*", "")
        return currentBranch.startsWith(prefix)
      }
      return currentBranch === pattern
    })

    return {
      currentBranch,
      currentPhase: phase,
      expectedBranches: expected,
      isAligned: isOnExpectedBranch,
      recommendation: isOnExpectedBranch
        ? "Branch is aligned with current phase"
        : `Consider switching to one of: ${expected.join(", ")}`,
    }
  },
}
