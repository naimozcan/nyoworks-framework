import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ═══════════════════════════════════════════════════════════════════════════════
// Custom Title Bar
// ═══════════════════════════════════════════════════════════════════════════════
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";
// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function TitleBar() {
    const appWindow = getCurrentWindow();
    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = () => appWindow.toggleMaximize();
    const handleClose = () => appWindow.close();
    return (_jsxs("div", { "data-tauri-drag-region": true, className: "h-10 flex items-center justify-between px-4 bg-card border-b select-none", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx("span", { className: "font-semibold text-sm text-foreground", children: "NYOWORKS" }) }), _jsxs("div", { className: "flex items-center", children: [_jsx("button", { onClick: handleMinimize, className: "h-10 w-12 flex items-center justify-center hover:bg-muted transition-colors", children: _jsx(Minus, { className: "h-4 w-4 text-foreground" }) }), _jsx("button", { onClick: handleMaximize, className: "h-10 w-12 flex items-center justify-center hover:bg-muted transition-colors", children: _jsx(Square, { className: "h-3.5 w-3.5 text-foreground" }) }), _jsx("button", { onClick: handleClose, className: "h-10 w-12 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors", children: _jsx(X, { className: "h-4 w-4" }) })] })] }));
}
