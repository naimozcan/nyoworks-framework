import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// ═══════════════════════════════════════════════════════════════════════════════
// Main Application
// ═══════════════════════════════════════════════════════════════════════════════
import { TitleBar } from "@/components/windows/title-bar";
// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function App() {
    return (_jsxs("div", { className: "flex flex-col h-screen bg-background", children: [_jsx(TitleBar, {}), _jsx("main", { className: "flex-1 p-6 overflow-auto", children: _jsxs("div", { className: "max-w-4xl mx-auto space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold text-foreground", children: "NYOWORKS Desktop" }), _jsx("p", { className: "text-muted-foreground", children: "Your desktop application is ready" })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "p-6 border rounded-lg bg-card", children: [_jsx("h3", { className: "font-semibold text-foreground", children: "Statistics" }), _jsx("p", { className: "text-2xl font-bold text-foreground mt-2", children: "1,234" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Total items" })] }), _jsxs("div", { className: "p-6 border rounded-lg bg-card", children: [_jsx("h3", { className: "font-semibold text-foreground", children: "Status" }), _jsx("p", { className: "text-2xl font-bold text-green-500 mt-2", children: "Online" }), _jsx("p", { className: "text-sm text-muted-foreground", children: "Connected to API" })] })] })] }) })] }));
}
