// ═══════════════════════════════════════════════════════════════════════════════
// Custom Title Bar
// ═══════════════════════════════════════════════════════════════════════════════

import { getCurrentWindow } from "@tauri-apps/api/window"
import { Minus, Square, X } from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function TitleBar() {
  const appWindow = getCurrentWindow()

  const handleMinimize = () => appWindow.minimize()
  const handleMaximize = () => appWindow.toggleMaximize()
  const handleClose = () => appWindow.close()

  return (
    <div
      data-tauri-drag-region
      className="h-10 flex items-center justify-between px-4 bg-card border-b select-none"
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm text-foreground">
          NYOWORKS
        </span>
      </div>

      <div className="flex items-center">
        <button
          onClick={handleMinimize}
          className="h-10 w-12 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Minus className="h-4 w-4 text-foreground" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-10 w-12 flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Square className="h-3.5 w-3.5 text-foreground" />
        </button>
        <button
          onClick={handleClose}
          className="h-10 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
