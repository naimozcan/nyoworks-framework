// ═══════════════════════════════════════════════════════════════════════════════
// Vite Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173,
    strictPort: false,
  },

  build: {
    target: "ES2020",
    outDir: "dist",
    sourcemap: process.env.NODE_ENV === "development",
  },

  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
})
