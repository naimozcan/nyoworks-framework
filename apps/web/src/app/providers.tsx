// ═══════════════════════════════════════════════════════════════════════════════
// Providers - tRPC + React Query
// ═══════════════════════════════════════════════════════════════════════════════

"use client"

import type { ReactNode } from "react"
import { TRPCProvider } from "@nyoworks/api-client/react"

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

interface ProvidersProps {
  children: ReactNode
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function Providers({ children }: ProvidersProps) {
  return (
    <TRPCProvider baseUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"}>
      {children}
    </TRPCProvider>
  )
}
