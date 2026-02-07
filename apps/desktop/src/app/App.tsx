// ═══════════════════════════════════════════════════════════════════════════════
// Main Application
// ═══════════════════════════════════════════════════════════════════════════════

import { TitleBar } from "@/components/windows/title-bar"

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function App() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <TitleBar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              NYOWORKS Desktop
            </h1>
            <p className="text-muted-foreground">
              Your desktop application is ready
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-6 border rounded-lg bg-card">
              <h3 className="font-semibold text-foreground">Statistics</h3>
              <p className="text-2xl font-bold text-foreground mt-2">1,234</p>
              <p className="text-sm text-muted-foreground">Total items</p>
            </div>

            <div className="p-6 border rounded-lg bg-card">
              <h3 className="font-semibold text-foreground">Status</h3>
              <p className="text-2xl font-bold text-green-500 mt-2">Online</p>
              <p className="text-sm text-muted-foreground">Connected to API</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
