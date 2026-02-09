// ═══════════════════════════════════════════════════════════════════════════════
// Config Loader - Load app definitions from YAML
// ═══════════════════════════════════════════════════════════════════════════════

import fs from "fs-extra"
import path from "path"
import { parse } from "yaml"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppDefinition {
  id: string
  name: string
  description: string
  platforms: ("web" | "mobile" | "desktop")[]
  features: string[]
  integrations: string[]
}

export interface IntegrationDefinition {
  name: string
  providers?: string[]
  default?: string
  services?: string[]
  free_tier?: Record<string, string>
  note?: string
}

export interface PlatformDefinition {
  name: string
  framework: string
  version: string
}

export interface AppsConfig {
  apps: AppDefinition[]
  integrations: Record<string, IntegrationDefinition>
  platforms: Record<string, PlatformDefinition>
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader Functions
// ─────────────────────────────────────────────────────────────────────────────

export async function loadAppsConfig(repoDir: string): Promise<AppsConfig> {
  const configPath = path.join(repoDir, "config", "apps.yaml")

  if (!await fs.pathExists(configPath)) {
    throw new Error("config/apps.yaml not found in repository")
  }

  const content = await fs.readFile(configPath, "utf8")
  return parse(content) as AppsConfig
}

export function appToPromptChoice(app: AppDefinition) {
  return {
    title: app.name,
    value: app.id,
    description: app.description,
  }
}

export function integrationToPromptChoices(
  integration: IntegrationDefinition,
  integrationId: string
) {
  if (!integration.providers || integration.providers.length <= 1) {
    return null
  }

  const defaultIndex = integration.providers.indexOf(
    integration.default || integration.providers[0]
  )

  return {
    choices: integration.providers.map((provider) => ({
      title: formatProviderName(provider),
      value: provider,
    })),
    initial: defaultIndex >= 0 ? defaultIndex : 0,
    message: `${integration.name} provider:`,
  }
}

function formatProviderName(provider: string): string {
  const names: Record<string, string> = {
    mollie: "Mollie (iDEAL, Bancontact)",
    adyen: "Adyen",
    stripe: "Stripe",
    resend: "Resend (3k/mo free)",
    brevo: "Brevo (300/day free)",
    twilio: "Twilio",
    plivo: "Plivo",
    postnl: "PostNL",
    sendcloud: "Sendcloud",
    dhl: "DHL",
    storecove: "Storecove",
  }

  return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getAppFeatures(app: AppDefinition): string[] {
  return app.features || []
}

export function getAppIntegrations(app: AppDefinition): string[] {
  return app.integrations || []
}

export function getAppPlatforms(app: AppDefinition): string[] {
  return app.platforms || ["web"]
}

