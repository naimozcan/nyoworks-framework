// ═══════════════════════════════════════════════════════════════════════════════
// Root Layout
// ═══════════════════════════════════════════════════════════════════════════════

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "./providers"
import "@/styles/globals.css"

// ─────────────────────────────────────────────────────────────────────────────
// Font
// ─────────────────────────────────────────────────────────────────────────────

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "NYOWORKS App",
  description: "Built with NYOWORKS Framework",
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
