// ═══════════════════════════════════════════════════════════════════════════════
// NYOWORKS MCP Server - State Backup & Recovery
// ═══════════════════════════════════════════════════════════════════════════════

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs"
import { join, dirname } from "path"
import type { ProjectState } from "../types.js"

const MAX_BACKUPS = 5
const BACKUP_EXTENSION = ".backup"

function getBackupDir(stateFile: string): string {
  return join(dirname(stateFile), "backups")
}

function getBackupFiles(stateFile: string): string[] {
  const backupDir = getBackupDir(stateFile)
  if (!existsSync(backupDir)) {
    return []
  }

  return readdirSync(backupDir)
    .filter((f) => f.endsWith(BACKUP_EXTENSION))
    .map((f) => join(backupDir, f))
    .sort((a, b) => {
      const statA = statSync(a)
      const statB = statSync(b)
      return statB.mtime.getTime() - statA.mtime.getTime()
    })
}

function createBackup(stateFile: string): string | null {
  if (!existsSync(stateFile)) {
    return null
  }

  const backupDir = getBackupDir(stateFile)
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupFile = join(backupDir, `state-${timestamp}${BACKUP_EXTENSION}`)

  try {
    const content = readFileSync(stateFile, "utf-8")
    JSON.parse(content)
    writeFileSync(backupFile, content)
    rotateBackups(stateFile)
    return backupFile
  } catch {
    return null
  }
}

function rotateBackups(stateFile: string): void {
  const backups = getBackupFiles(stateFile)

  while (backups.length > MAX_BACKUPS) {
    const oldest = backups.pop()
    if (oldest) {
      try {
        unlinkSync(oldest)
      } catch {
        // Ignore deletion errors
      }
    }
  }
}

function recoverFromBackup(stateFile: string): ProjectState | null {
  const backups = getBackupFiles(stateFile)

  for (const backup of backups) {
    try {
      const content = readFileSync(backup, "utf-8")
      const state = JSON.parse(content) as ProjectState

      if (validateState(state)) {
        writeFileSync(stateFile, content)
        return state
      }
    } catch {
      continue
    }
  }

  return null
}

function validateState(state: unknown): state is ProjectState {
  if (!state || typeof state !== "object") {
    return false
  }

  const s = state as Record<string, unknown>

  if (typeof s.name !== "string") return false
  if (typeof s.code !== "string") return false
  if (typeof s.phase !== "string") return false
  if (!Array.isArray(s.enabledFeatures)) return false
  if (!Array.isArray(s.tasks)) return false
  if (typeof s.taskLocks !== "object" || s.taskLocks === null) return false
  if (!Array.isArray(s.decisions)) return false
  if (!Array.isArray(s.activityLog)) return false
  if (!Array.isArray(s.errorLog)) return false
  if (typeof s.agents !== "object" || s.agents === null) return false

  return true
}

function getBackupInfo(stateFile: string): { count: number; latest: string | null; oldest: string | null } {
  const backups = getBackupFiles(stateFile)

  return {
    count: backups.length,
    latest: backups[0] || null,
    oldest: backups[backups.length - 1] || null,
  }
}

export {
  createBackup,
  recoverFromBackup,
  validateState,
  getBackupInfo,
  getBackupDir,
  getBackupFiles,
  MAX_BACKUPS,
}
