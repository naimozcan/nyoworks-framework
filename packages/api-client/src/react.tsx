// ═══════════════════════════════════════════════════════════════════════════════
// React tRPC Client (with React Query)
// ═══════════════════════════════════════════════════════════════════════════════

import { createTRPCReact, httpBatchLink, loggerLink, type CreateTRPCReact } from "@trpc/react-query"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import superjson from "superjson"
import type { AppRouter } from "@nyoworks/api"
import type { ReactNode } from "react"
import { useState } from "react"
import { TIMEOUTS } from "@nyoworks/shared"

// ─────────────────────────────────────────────────────────────────────────────
// tRPC React Hooks
// ─────────────────────────────────────────────────────────────────────────────

export const trpc: CreateTRPCReact<AppRouter, unknown> = createTRPCReact<AppRouter>()

// ─────────────────────────────────────────────────────────────────────────────
// Provider Config
// ─────────────────────────────────────────────────────────────────────────────

export interface TRPCProviderProps {
  children: ReactNode
  baseUrl: string
  getToken?: () => string | null | Promise<string | null>
  getTenantId?: () => string | null | Promise<string | null>
}

export function TRPCProvider({
  children,
  baseUrl,
  getToken,
  getTenantId,
}: TRPCProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: TIMEOUTS.STALE_TIME,
            retry: 1,
          },
        },
      })
  )

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${baseUrl}/trpc`,
          transformer: superjson,
          async headers() {
            const headers: Record<string, string> = {}

            if (getToken) {
              const token = await getToken()
              if (token) {
                headers["Authorization"] = `Bearer ${token}`
              }
            }

            if (getTenantId) {
              const tenantId = await getTenantId()
              if (tenantId) {
                headers["X-Tenant-ID"] = tenantId
              }
            }

            return headers
          },
        }),
      ],
    })
  )

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export { QueryClient, QueryClientProvider } from "@tanstack/react-query"
