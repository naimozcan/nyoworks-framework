// ═══════════════════════════════════════════════════════════════════════════════
// Web Platform Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export interface WebConfig {
  framework: "nextjs"
  version: "16"
  features: {
    appRouter: boolean
    serverActions: boolean
    turbopack: boolean
  }
  defaults: {
    port: number
    hostname: string
  }
}

export const webConfig: WebConfig = {
  framework: "nextjs",
  version: "16",
  features: {
    appRouter: true,
    serverActions: true,
    turbopack: true,
  },
  defaults: {
    port: 3000,
    hostname: "localhost",
  },
}
