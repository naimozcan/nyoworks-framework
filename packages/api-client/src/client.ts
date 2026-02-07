// ═══════════════════════════════════════════════════════════════════════════════
// Base tRPC Client Factory
// ═══════════════════════════════════════════════════════════════════════════════

import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client"
import superjson from "superjson"
import type { AppRouter } from "@nyoworks/api"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ClientConfig {
  baseUrl: string
  getToken?: () => string | null | Promise<string | null>
  getTenantId?: () => string | null | Promise<string | null>
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createApiClient(config: ClientConfig) {
  return createTRPCClient<AppRouter>({
    links: [
      loggerLink({
        enabled: (opts) =>
          process.env.NODE_ENV === "development" ||
          (opts.direction === "down" && opts.result instanceof Error),
      }),
      httpBatchLink({
        url: `${config.baseUrl}/trpc`,
        transformer: superjson,
        async headers() {
          const headers: Record<string, string> = {}

          if (config.getToken) {
            const token = await config.getToken()
            if (token) {
              headers["Authorization"] = `Bearer ${token}`
            }
          }

          if (config.getTenantId) {
            const tenantId = await config.getTenantId()
            if (tenantId) {
              headers["X-Tenant-ID"] = tenantId
            }
          }

          return headers
        },
      }),
    ],
  })
}

export type ApiClient = ReturnType<typeof createApiClient>
