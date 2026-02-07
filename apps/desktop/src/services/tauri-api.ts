// ═══════════════════════════════════════════════════════════════════════════════
// Tauri API Service
// ═══════════════════════════════════════════════════════════════════════════════

import { invoke } from "@tauri-apps/api/core"
import { getApi } from "@nyoworks/api-client/vanilla"

// ─────────────────────────────────────────────────────────────────────────────
// Invoke Wrapper
// ─────────────────────────────────────────────────────────────────────────────

export async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return invoke<T>(command, args)
}

// ─────────────────────────────────────────────────────────────────────────────
// System Commands
// ─────────────────────────────────────────────────────────────────────────────

export async function getAppInfo(): Promise<{ name: string; version: string }> {
  return invokeCommand("get_app_info")
}

// ─────────────────────────────────────────────────────────────────────────────
// API Client
// ─────────────────────────────────────────────────────────────────────────────

export function api() {
  return getApi()
}
