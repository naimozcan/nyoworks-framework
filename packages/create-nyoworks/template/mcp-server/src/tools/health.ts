// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - Health Check Tools
// ═══════════════════════════════════════════════════════════════════════════════

import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs"
import { join } from "path"
import { randomBytes } from "crypto"
import type { ToolHandler, ToolDefinition } from "../types.js"
import { getProjectRoot, getState, loadState, saveState } from "../state.js"
import { getBackupInfo, createBackup, recoverFromBackup, validateState } from "../utils/backup.js"

// ─────────────────────────────────────────────────────────────────────────────
// Health Check Handler
// ─────────────────────────────────────────────────────────────────────────────

function getStateFile(): string {
  return join(getProjectRoot(), ".nyoworks", "state.json")
}

function getBibleDir(): string {
  return join(getProjectRoot(), "docs", "bible")
}

interface HealthCheckResult {
  healthy: boolean
  checks: {
    mcp_server: boolean
    state_file_exists: boolean
    state_file_valid: boolean
    state_file_readable: boolean
    state_file_writable: boolean
    bible_dir_exists: boolean
    backup_available: boolean
  }
  details: {
    phase: string | null
    task_count: number
    active_locks: number
    backup_count: number
    last_backup: string | null
    error_count: number
  }
  issues: string[]
  recovery_attempted: boolean
  recovery_success: boolean
}

function healthCheck(): HealthCheckResult {
  const result: HealthCheckResult = {
    healthy: true,
    checks: {
      mcp_server: true,
      state_file_exists: false,
      state_file_valid: false,
      state_file_readable: false,
      state_file_writable: false,
      bible_dir_exists: false,
      backup_available: false,
    },
    details: {
      phase: null,
      task_count: 0,
      active_locks: 0,
      backup_count: 0,
      last_backup: null,
      error_count: 0,
    },
    issues: [],
    recovery_attempted: false,
    recovery_success: false,
  }

  const stateFile = getStateFile()
  const bibleDir = getBibleDir()

  result.checks.state_file_exists = existsSync(stateFile)
  result.checks.bible_dir_exists = existsSync(bibleDir)

  if (!result.checks.bible_dir_exists) {
    result.issues.push("Bible directory not found at docs/bible/")
  }

  const backupInfo = getBackupInfo(stateFile)
  result.details.backup_count = backupInfo.count
  result.details.last_backup = backupInfo.latest
  result.checks.backup_available = backupInfo.count > 0

  if (result.checks.state_file_exists) {
    try {
      const content = readFileSync(stateFile, "utf-8")
      result.checks.state_file_readable = true

      try {
        const parsed = JSON.parse(content)
        result.checks.state_file_valid = validateState(parsed)

        if (!result.checks.state_file_valid) {
          result.issues.push("State file has invalid structure")
        }
      } catch {
        result.issues.push("State file contains invalid JSON")
      }
    } catch {
      result.issues.push("State file is not readable")
    }
  } else {
    result.issues.push("State file does not exist")
  }

  if (!result.checks.state_file_valid && result.checks.backup_available) {
    result.recovery_attempted = true
    const recovered = recoverFromBackup(stateFile)
    if (recovered) {
      result.recovery_success = true
      result.checks.state_file_valid = true
      result.issues.push("State recovered from backup")
    } else {
      result.issues.push("Recovery from backup failed")
    }
  }

  if (result.checks.state_file_exists && result.checks.state_file_valid) {
    const testFile = join(getProjectRoot(), ".nyoworks", `.health-test-${randomBytes(4).toString("hex")}`)
    try {
      writeFileSync(testFile, "test")
      unlinkSync(testFile)
      result.checks.state_file_writable = true
    } catch {
      result.issues.push("State directory is not writable")
    }
  }

  if (result.checks.state_file_valid) {
    try {
      loadState()
      const state = getState()
      result.details.phase = state.phase
      result.details.task_count = state.tasks?.length || 0
      result.details.active_locks = Object.keys(state.taskLocks || {}).length
      result.details.error_count = state.errorLog?.length || 0
    } catch {
      result.issues.push("Failed to load state into memory")
      result.checks.state_file_valid = false
    }
  }

  result.healthy =
    result.checks.mcp_server &&
    result.checks.state_file_valid &&
    result.checks.state_file_readable &&
    result.checks.state_file_writable &&
    result.checks.bible_dir_exists

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Backup Handler
// ─────────────────────────────────────────────────────────────────────────────

interface CreateBackupResult {
  success: boolean
  backupFile: string | null
  backupCount: number
  error: string | null
}

function handleCreateBackup(): CreateBackupResult {
  const stateFile = getStateFile()

  if (!existsSync(stateFile)) {
    return {
      success: false,
      backupFile: null,
      backupCount: 0,
      error: "State file does not exist",
    }
  }

  const backupFile = createBackup(stateFile)

  if (!backupFile) {
    return {
      success: false,
      backupFile: null,
      backupCount: getBackupInfo(stateFile).count,
      error: "Failed to create backup - state file may be invalid",
    }
  }

  return {
    success: true,
    backupFile,
    backupCount: getBackupInfo(stateFile).count,
    error: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Recovery Handler
// ─────────────────────────────────────────────────────────────────────────────

interface RecoverStateResult {
  success: boolean
  recoveredFrom: string | null
  phase: string | null
  taskCount: number
  error: string | null
}

function handleRecoverState(): RecoverStateResult {
  const stateFile = getStateFile()

  const recovered = recoverFromBackup(stateFile)

  if (!recovered) {
    return {
      success: false,
      recoveredFrom: null,
      phase: null,
      taskCount: 0,
      error: "No valid backup found for recovery",
    }
  }

  const backupInfo = getBackupInfo(stateFile)

  return {
    success: true,
    recoveredFrom: backupInfo.latest,
    phase: recovered.phase,
    taskCount: recovered.tasks?.length || 0,
    error: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers Export
// ─────────────────────────────────────────────────────────────────────────────

const handlers: Record<string, ToolHandler> = {
  health_check: () => healthCheck(),
  create_backup: () => handleCreateBackup(),
  recover_state: () => handleRecoverState(),
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Definitions
// ─────────────────────────────────────────────────────────────────────────────

const definitions: ToolDefinition[] = [
  {
    name: "health_check",
    description:
      "Perform comprehensive health check on MCP server and project state. " +
      "Checks state file validity, Bible directory, backups, and attempts " +
      "automatic recovery if state is corrupted. Returns detailed status.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "create_backup",
    description:
      "Create a backup of the current state file. Backups are rotated " +
      "automatically (max 5 kept). Use before risky operations or " +
      "periodically for safety.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "recover_state",
    description:
      "Recover state from the most recent valid backup. Use when state " +
      "file is corrupted or missing. Tries backups in order until one " +
      "is valid.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
]

export { handlers, definitions }
