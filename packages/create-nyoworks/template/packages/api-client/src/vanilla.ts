// ═══════════════════════════════════════════════════════════════════════════════
// Vanilla tRPC Client (for Mobile/Desktop)
// ═══════════════════════════════════════════════════════════════════════════════

import { createApiClient, type ClientConfig, type ApiClient } from "./client"

// ─────────────────────────────────────────────────────────────────────────────
// Singleton Instance
// ─────────────────────────────────────────────────────────────────────────────

let clientInstance: ApiClient | null = null
let currentConfig: ClientConfig | null = null

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Client
// ─────────────────────────────────────────────────────────────────────────────

export function initializeApi(config: ClientConfig): ApiClient {
  currentConfig = config
  clientInstance = createApiClient(config)
  return clientInstance
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Client
// ─────────────────────────────────────────────────────────────────────────────

export function getApi(): ApiClient {
  if (!clientInstance) {
    throw new Error(
      "API client not initialized. Call initializeApi() first."
    )
  }
  return clientInstance
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset Client (for logout, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export function resetApi(): void {
  clientInstance = null
  currentConfig = null
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-initialize (after token refresh, etc.)
// ─────────────────────────────────────────────────────────────────────────────

export function refreshApi(): ApiClient {
  if (!currentConfig) {
    throw new Error("No previous config found. Call initializeApi() first.")
  }
  return initializeApi(currentConfig)
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export { createApiClient, type ClientConfig, type ApiClient } from "./client"
