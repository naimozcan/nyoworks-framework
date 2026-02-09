// ═══════════════════════════════════════════════════════════════════════════════
// Dashboard Layout
// ═══════════════════════════════════════════════════════════════════════════════

import { Header } from "@/components/layouts/header"
import { Sidebar } from "@/components/layouts/sidebar"

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
