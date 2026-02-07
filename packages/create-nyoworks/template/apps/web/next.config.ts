// ═══════════════════════════════════════════════════════════════════════════════
// Next.js 16 Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },

  experimental: {
    typedRoutes: false,
  },

  transpilePackages: [
    "@nyoworks/api-client",
    "@nyoworks/ui",
    "@nyoworks/validators",
  ],
}

export default nextConfig
