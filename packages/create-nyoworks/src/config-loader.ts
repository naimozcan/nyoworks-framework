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
  name_tr: string
  description: string
  description_tr: string
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

export function appToPromptChoice(app: AppDefinition, lang: string = "en") {
  const name = lang === "tr" ? app.name_tr : app.name
  const desc = lang === "tr" ? app.description_tr : app.description

  return {
    title: name,
    value: app.id,
    description: desc,
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
    resend: "Resend (3000/ay free)",
    brevo: "Brevo (300/gün free)",
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

