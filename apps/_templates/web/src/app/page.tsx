// ═══════════════════════════════════════════════════════════════════════════════
// Homepage
// ═══════════════════════════════════════════════════════════════════════════════

import Link from "next/link"
import { Button } from "@nyoworks/ui"

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Welcome to NYOWORKS
        </h1>
        <p className="text-muted-foreground text-lg max-w-md">
          Your project is ready. Start building your application.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/register">Register</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
