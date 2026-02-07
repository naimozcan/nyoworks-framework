import { jsx as _jsx } from "react/jsx-runtime";
// ═══════════════════════════════════════════════════════════════════════════════
// Application Entry Point
// ═══════════════════════════════════════════════════════════════════════════════
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initializeApi } from "@nyoworks/api-client/vanilla";
import { App } from "./app/App";
import "./styles/globals.css";
// ─────────────────────────────────────────────────────────────────────────────
// Initialize API
// ─────────────────────────────────────────────────────────────────────────────
initializeApi({
    baseUrl: import.meta.env.VITE_API_URL ?? "http://localhost:3001/api",
});
// ─────────────────────────────────────────────────────────────────────────────
// Query Client
// ─────────────────────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 1000,
            retry: 1,
        },
    },
});
// ─────────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(_jsx(React.StrictMode, { children: _jsx(QueryClientProvider, { client: queryClient, children: _jsx(App, {}) }) }));
