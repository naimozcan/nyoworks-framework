// ═══════════════════════════════════════════════════════════════════════════════
// Create NYOWORKS - Project Initialization (Multi-Product Support)
// ═══════════════════════════════════════════════════════════════════════════════

import prompts from "prompts"
import pc from "picocolors"
import fs from "fs-extra"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import { execa } from "execa"
import { replacePlaceholders } from "./replace.js"
import { checkDependencies, showClaudeMaxWarning, getDockerComposeCommand } from "./checks.js"
import {
  loadAppsConfig,
  appToPromptChoice,
  integrationToPromptChoices,
  getAppFeatures,
  getAppPlatforms,
  type AppsConfig,
  type AppDefinition,
} from "./config-loader.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ProductSelection {
  app: AppDefinition
  platforms: ("web" | "mobile" | "desktop")[]
}

interface ProjectConfig {
  name: string
  code: string
  slug: string
  databaseName: string
  products: ProductSelection[]
  features: string[]
  providers: Record<string, string>
  language: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const REPO = "naimozcan/nyoworks-framework"
const BRANCH = "main"

const AVAILABLE_PLATFORMS = [
  { title: "Web", value: "web", description: "Next.js 16" },
  { title: "Mobile", value: "mobile", description: "Expo SDK 54" },
  { title: "Desktop", value: "desktop", description: "Tauri 2.0" },
]

const AVAILABLE_LANGUAGES = [
  { title: "Turkish", value: "tr", description: "Türkçe yanıtlar" },
  { title: "English", value: "en", description: "English responses" },
  { title: "Dutch", value: "nl", description: "Nederlandse antwoorden" },
]

const LANGUAGE_RESPONSES: Record<string, string> = {
  tr: "Turkish",
  en: "English",
  nl: "Dutch",
}

const ADDITIONAL_FEATURES = [
  { title: "Realtime", value: "realtime", description: "WebSocket support" },
  { title: "i18n", value: "i18n", description: "Multi-language support" },
  { title: "Auth Social", value: "auth-social", description: "Google, Apple, GitHub OAuth" },
  { title: "Multitenant", value: "multitenant", description: "Multi-organization support" },
  { title: "Subscriptions", value: "subscriptions", description: "Plans & usage limits" },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

function generateCode(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4)
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function generateDatabaseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "") + "_dev"
}

async function downloadRepo(repo: string, branch: string): Promise<string> {
  const url = `https://github.com/${repo}/archive/refs/heads/${branch}.tar.gz`
  const tempDir = path.join(os.tmpdir(), `nyoworks-${Date.now()}`)
  const tarFile = path.join(tempDir, "repo.tar.gz")

  await fs.ensureDir(tempDir)

  await execa("curl", ["-L", "-o", tarFile, url])
  await execa("tar", ["-xzf", tarFile, "-C", tempDir])

  return path.join(tempDir, `nyoworks-framework-${branch}`)
}

function getLocalRepoPath(): string | null {
  const localPath = path.resolve(__dirname, "..", "..", "..")
  const configPath = path.join(localPath, "config", "apps.yaml")
  if (fs.existsSync(configPath)) {
    return localPath
  }
  return null
}

async function replacePackageNames(targetDir: string, slug: string): Promise<void> {
  const pkgFiles = await findPackageJsonFiles(targetDir)
  for (const pkgFile of pkgFiles) {
    let content = await fs.readFile(pkgFile, "utf8")
    content = content.replace(/@nyoworks\//g, `@${slug}/`)
    await fs.writeFile(pkgFile, content)
  }
}

async function findPackageJsonFiles(dir: string): Promise<string[]> {
  const results: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      results.push(...await findPackageJsonFiles(fullPath))
    } else if (entry.isFile() && entry.name === "package.json") {
      results.push(fullPath)
    }
  }

  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Function
// ─────────────────────────────────────────────────────────────────────────────

export async function createProject(projectName?: string) {
  console.log()
  console.log(pc.cyan(pc.bold("  NYOWORKS Framework")))
  console.log(pc.dim("  Create a new multi-product project"))
  console.log()

  const nameResponse = await prompts({
    type: projectName ? null : "text",
    name: "name",
    message: "Project name:",
    initial: projectName || "my-project",
    validate: (value) => (value.length > 0 ? true : "Project name is required"),
  })

  if (!nameResponse.name && !projectName) {
    console.log(pc.red("Aborted."))
    process.exit(1)
  }

  const name = (nameResponse.name || projectName)!
  const code = generateCode(name)
  const slug = generateSlug(name)
  const databaseName = generateDatabaseName(name)

  const targetDir = path.resolve(process.cwd(), slug)

  if (fs.existsSync(targetDir)) {
    console.log(pc.red(`Directory ${slug} already exists.`))
    process.exit(1)
  }

  console.log()

  let repoDir: string
  let config: AppsConfig
  let isLocalMode = false

  const localRepo = getLocalRepoPath()
  if (localRepo) {
    process.stdout.write(pc.cyan("Using local framework..."))
    repoDir = localRepo
    isLocalMode = true
    try {
      config = await loadAppsConfig(repoDir)
      console.log(pc.green(" done"))
    } catch (error) {
      console.log(pc.red(" failed"))
      console.error(pc.red("Failed to load local config."))
      process.exit(1)
    }
  } else {
    process.stdout.write(pc.cyan("Downloading from GitHub..."))
    try {
      repoDir = await downloadRepo(REPO, BRANCH)
      config = await loadAppsConfig(repoDir)
      console.log(pc.green(" done"))
    } catch (error) {
      console.log(pc.red(" failed"))
      console.error(pc.red("Failed to download from GitHub. Check your internet connection."))
      process.exit(1)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Multi-Product Selection
  // ─────────────────────────────────────────────────────────────────────────────

  const appChoices = config.apps.map((app) => ({
    ...appToPromptChoice(app, "tr"),
    selected: false,
  }))

  const productsResponse = await prompts({
    type: "multiselect",
    name: "appIds",
    message: "Products (birden fazla seçebilirsiniz):",
    choices: appChoices,
    min: 1,
    hint: "- Space to select. Return to submit",
    instructions: false,
  })

  if (!productsResponse.appIds || productsResponse.appIds.length === 0) {
    console.log(pc.red("Aborted."))
    process.exit(1)
  }

  const selectedAppIds: string[] = productsResponse.appIds
  const selectedApps = config.apps.filter((a) => selectedAppIds.includes(a.id))

  // ─────────────────────────────────────────────────────────────────────────────
  // Per-Product Platform Selection
  // ─────────────────────────────────────────────────────────────────────────────

  const productSelections: ProductSelection[] = []

  for (const app of selectedApps) {
    console.log()
    console.log(pc.cyan(`  ${app.name_tr || app.name} platformları:`))

    const appPlatforms = getAppPlatforms(app)
    const platformChoices = AVAILABLE_PLATFORMS
      .filter((p) => appPlatforms.includes(p.value as "web" | "mobile" | "desktop"))
      .map((p) => ({ ...p, selected: p.value === "web" }))

    const platformResponse = await prompts({
      type: "multiselect",
      name: "platforms",
      message: `${app.id} platforms:`,
      choices: platformChoices,
      min: 1,
      hint: "- Space to select. Return to submit",
      instructions: false,
    })

    const platforms = (platformResponse.platforms || ["web"]) as ("web" | "mobile" | "desktop")[]
    productSelections.push({ app, platforms })
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Collect All Features from All Products
  // ─────────────────────────────────────────────────────────────────────────────

  const allAppFeatures = new Set<string>()
  const allIntegrations = new Set<string>()

  for (const selection of productSelections) {
    const features = getAppFeatures(selection.app)
    features.forEach((f) => allAppFeatures.add(f))

    for (const integration of selection.app.integrations || []) {
      allIntegrations.add(integration)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Integration Provider Selection (Once for All Products)
  // ─────────────────────────────────────────────────────────────────────────────

  const selectedProviders: Record<string, string> = {}

  for (const integrationId of allIntegrations) {
    const integration = config.integrations?.[integrationId]
    if (!integration) continue

    const promptConfig = integrationToPromptChoices(integration, integrationId)
    if (!promptConfig) {
      selectedProviders[integrationId] = integration.default || integration.providers?.[0] || integrationId
      continue
    }

    const providerResponse = await prompts({
      type: "select",
      name: "provider",
      message: promptConfig.message,
      choices: promptConfig.choices,
      initial: promptConfig.initial,
    })

    if (providerResponse.provider) {
      selectedProviders[integrationId] = providerResponse.provider
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Additional Features
  // ─────────────────────────────────────────────────────────────────────────────

  const additionalFeaturesNotInApps = ADDITIONAL_FEATURES.filter(
    (f) => !allAppFeatures.has(f.value)
  )

  let additionalFeatures: string[] = []

  if (additionalFeaturesNotInApps.length > 0) {
    const additionalResponse = await prompts({
      type: "multiselect",
      name: "features",
      message: "Ek feature'lar (isteğe bağlı):",
      choices: additionalFeaturesNotInApps,
      hint: "- Space to select. Return to submit",
      instructions: false,
    })

    additionalFeatures = additionalResponse.features || []
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Language Selection
  // ─────────────────────────────────────────────────────────────────────────────

  const languageResponse = await prompts({
    type: "select",
    name: "language",
    message: "Agent language:",
    choices: AVAILABLE_LANGUAGES,
    initial: 0,
  })

  const language: string = languageResponse.language || "tr"
  const features: string[] = [...new Set([...allAppFeatures, ...additionalFeatures])]

  // ─────────────────────────────────────────────────────────────────────────────
  // Build Project Config
  // ─────────────────────────────────────────────────────────────────────────────

  const projectConfig: ProjectConfig = {
    name,
    code,
    slug,
    databaseName,
    products: productSelections,
    features,
    providers: selectedProviders,
    language,
  }

  console.log()
  process.stdout.write(pc.dim("  Copying files..."))

  await fs.ensureDir(targetDir)

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy Core Packages (Shared)
  // ─────────────────────────────────────────────────────────────────────────────

  const corePaths = [
    "packages/api",
    "packages/api-client",
    "packages/database",
    "packages/validators",
    "packages/shared",
    "packages/ui",
    "packages/assets",
    "apps/server",
    "docs/bible",
    "mcp-server",
    ".claude",
    "config",
  ]

  for (const p of corePaths) {
    const src = path.join(repoDir, p)
    const dest = path.join(targetDir, p)
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy Apps (Per Product + Platform)
  // ─────────────────────────────────────────────────────────────────────────────

  for (const selection of productSelections) {
    const appId = selection.app.id

    for (const platform of selection.platforms) {
      const templateSrc = path.join(repoDir, `apps/_templates/${platform}`)
      const legacySrc = path.join(repoDir, `apps/${platform}`)
      const dest = path.join(targetDir, `apps/${appId}/${platform}`)

      if (await fs.pathExists(templateSrc)) {
        await fs.copy(templateSrc, dest)
      } else if (await fs.pathExists(legacySrc)) {
        await fs.copy(legacySrc, dest)
      }

      const pkgPath = path.join(dest, "package.json")
      if (await fs.pathExists(pkgPath)) {
        const pkg = await fs.readJson(pkgPath)
        pkg.name = `@${slug}/${appId}-${platform}`
        await fs.writeJson(pkgPath, pkg, { spaces: 2 })
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy Feature Packages
  // ─────────────────────────────────────────────────────────────────────────────

  for (const feature of features) {
    const src = path.join(repoDir, `packages/features/${feature}`)
    const dest = path.join(targetDir, `packages/features/${feature}`)
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest)
    }
  }

  const integrationFeatureMap: Record<string, string[]> = {
    payments: ["payments"],
    shipping: ["shipping"],
    invoicing: ["invoicing"],
    whatsapp: ["whatsapp"],
    google: ["google"],
    ai: ["ai"],
    email: [],
    sms: [],
  }

  for (const integrationId of allIntegrations) {
    const featuresToCopy = integrationFeatureMap[integrationId] || []
    for (const featureName of featuresToCopy) {
      const src = path.join(repoDir, `packages/features/${featureName}`)
      const dest = path.join(targetDir, `packages/features/${featureName}`)
      if (await fs.pathExists(src) && !await fs.pathExists(dest)) {
        await fs.copy(src, dest)
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Copy Root Files
  // ─────────────────────────────────────────────────────────────────────────────

  const rootFiles = [
    "package.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    "tsconfig.json",
    "tsconfig.base.json",
    ".env.example",
    ".gitignore",
    "nyoworks.config.yaml",
    "docker-compose.yml",
  ]

  for (const file of rootFiles) {
    const src = path.join(repoDir, file)
    const dest = path.join(targetDir, file)
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest)
    }
  }

  if (!isLocalMode) {
    await fs.remove(path.dirname(repoDir))
  }

  console.log(pc.green(" done"))

  // ─────────────────────────────────────────────────────────────────────────────
  // Update Package Names
  // ─────────────────────────────────────────────────────────────────────────────

  process.stdout.write(pc.dim("  Updating package names..."))
  await replacePackageNames(targetDir, slug)
  console.log(pc.green(" done"))

  // ─────────────────────────────────────────────────────────────────────────────
  // Replace Placeholders
  // ─────────────────────────────────────────────────────────────────────────────

  const primaryApp = productSelections[0].app
  const allPlatforms = [...new Set(productSelections.flatMap((s) => s.platforms))]

  const placeholders: Record<string, string> = {
    "${PROJECT_NAME}": name,
    "${PROJECT_CODE}": code,
    "${PROJECT_SLUG}": slug,
    "${DATABASE_NAME}": databaseName,
    "${APP_ID}": primaryApp.id,
    "${APP_NAME}": primaryApp.name,
    "${PRODUCT_TYPE}": primaryApp.id,
    "${RESPONSE_LANGUAGE}": LANGUAGE_RESPONSES[language] || "Turkish",
  }

  process.stdout.write(pc.dim("  Replacing placeholders..."))
  await replacePlaceholders(targetDir, placeholders)
  console.log(pc.green(" done"))

  // ─────────────────────────────────────────────────────────────────────────────
  // Create Feature Docs
  // ─────────────────────────────────────────────────────────────────────────────

  for (const feature of features) {
    const featureDoc = path.join(targetDir, "docs", "bible", "features", `${feature}.md`)
    if (!await fs.pathExists(featureDoc)) {
      const content = `# Feature: ${feature.charAt(0).toUpperCase() + feature.slice(1)}

## Overview

> Describe what this feature does

## Requirements

- [ ] Requirement 1
- [ ] Requirement 2

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/${feature} | List items |
| POST | /api/${feature} | Create item |

## Data Model

See \`docs/bible/data/schema.md\`

## UI Components

- [ ] Component 1
- [ ] Component 2

## Decisions

| ID | Decision | Rationale |
|----|----------|-----------|
| T-xxx | [Decision] | [Why] |
`
      await fs.outputFile(featureDoc, content)
      console.log(pc.dim(`  Created docs/bible/features/${feature}.md`))
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Generate Multi-Product Config (apps.config.yaml)
  // ─────────────────────────────────────────────────────────────────────────────

  const appsConfigContent = generateAppsConfigYaml(projectConfig)
  await fs.outputFile(path.join(targetDir, "config", "apps.config.yaml"), appsConfigContent)
  console.log(pc.dim("  Created config/apps.config.yaml (multi-product config)"))

  // ─────────────────────────────────────────────────────────────────────────────
  // Update nyoworks.config.yaml
  // ─────────────────────────────────────────────────────────────────────────────

  const configPath = path.join(targetDir, "nyoworks.config.yaml")
  if (await fs.pathExists(configPath)) {
    let configContent = await fs.readFile(configPath, "utf8")
    if (features.length > 0) {
      configContent = configContent.replace(
        /enabled: \[\]/,
        `enabled:\n${features.map((f) => `    - ${f}`).join("\n")}`
      )
    }
    configContent = configContent.replace(
      /targets:\n    - web/,
      `targets:\n${allPlatforms.map((p) => `    - ${p}`).join("\n")}`
    )
    await fs.writeFile(configPath, configContent)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Update pnpm-workspace.yaml
  // ─────────────────────────────────────────────────────────────────────────────

  const workspacePath = path.join(targetDir, "pnpm-workspace.yaml")
  if (await fs.pathExists(workspacePath)) {
    const workspaceContent = `packages:
  - "apps/server"
  - "apps/*/*"
  - "packages/*"
  - "packages/features/*"
  - "packages/platforms/*"
  - "mcp-server"
`
    await fs.writeFile(workspacePath, workspaceContent)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Success Message
  // ─────────────────────────────────────────────────────────────────────────────

  console.log()
  console.log(pc.green(pc.bold("Multi-product project created successfully!")))

  await checkDependencies()

  const dockerCmd = await getDockerComposeCommand()

  showClaudeMaxWarning()

  console.log()
  console.log(pc.bold("  Next steps:"))
  console.log()
  console.log(pc.cyan(`    cd ${slug}`))
  console.log(pc.cyan("    pnpm install"))
  console.log(pc.cyan(`    ${dockerCmd} up -d`) + "        " + pc.dim("# Start PostgreSQL & Redis"))
  console.log(pc.cyan("    pnpm dev"))
  console.log()
  console.log(pc.dim("  Optional:"))
  console.log(pc.dim("    code .                    # Open in VS Code"))
  console.log(pc.dim("    claude                    # Start Claude Code CLI"))
  console.log()
  console.log(pc.dim("  Configuration:"))
  console.log(pc.dim(`    Name: ${name}`))
  console.log(pc.dim(`    Code: ${code}`))

  console.log(pc.dim("  Products:"))
  for (const selection of productSelections) {
    console.log(pc.dim(`    - ${selection.app.name} (${selection.app.id}): ${selection.platforms.join(", ")}`))
  }

  console.log(pc.dim(`    Features: ${features.join(", ") || "none"}`))
  if (Object.keys(selectedProviders).length > 0) {
    console.log(pc.dim(`    Providers: ${Object.entries(selectedProviders).map(([k, v]) => `${k}:${v}`).join(", ")}`))
  }
  console.log(pc.dim(`    Language: ${LANGUAGE_RESPONSES[language] || "Turkish"}`))
  console.log()

  // ─────────────────────────────────────────────────────────────────────────────
  // Build MCP Server
  // ─────────────────────────────────────────────────────────────────────────────

  process.stdout.write(pc.dim("  Building MCP server..."))
  const mcpPath = path.join(targetDir, "mcp-server")
  try {
    await execa("pnpm", ["install"], { cwd: mcpPath })
    await execa("pnpm", ["build"], { cwd: mcpPath })
    console.log(pc.green(" done"))
  } catch (error) {
    console.log(pc.yellow(" failed"))
    if (error instanceof Error) {
      console.log(pc.dim(`    Error: ${error.message.split("\n")[0]}`))
    }
    console.log(pc.dim("    Run manually: cd mcp-server && pnpm install && pnpm build"))
  }

  const mcpConfigPath = path.join(targetDir, ".claude", "settings.local.json")
  const mcpConfig = {
    mcpServers: {
      nyoworks: {
        command: "node",
        args: [path.join(targetDir, "mcp-server", "dist", "index.js")],
        env: {
          PROJECT_ROOT: targetDir,
        },
      },
    },
  }
  await fs.outputJson(mcpConfigPath, mcpConfig, { spaces: 2 })
  console.log(pc.dim("  Created .claude/settings.local.json"))
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Multi-Product Config YAML
// ─────────────────────────────────────────────────────────────────────────────

function generateAppsConfigYaml(config: ProjectConfig): string {
  const productsYaml = config.products.map((p) => `  ${p.app.id}:
    name: "${p.app.name}"
    name_tr: "${p.app.name_tr || p.app.name}"
    platforms:
${p.platforms.map((pl) => `      - ${pl}`).join("\n")}
    features:
${getAppFeatures(p.app).map((f) => `      - ${f}`).join("\n")}`
  ).join("\n\n")

  const providersYaml = Object.entries(config.providers)
    .map(([k, v]) => `  ${k}: "${v}"`)
    .join("\n")

  return `# ═══════════════════════════════════════════════════════════════════════════════
# ${config.name} - Multi-Product Configuration
# ═══════════════════════════════════════════════════════════════════════════════

project:
  name: "${config.name}"
  code: "${config.code}"
  slug: "${config.slug}"
  database: "${config.databaseName}"
  language: "${config.language}"

# ─────────────────────────────────────────────────────────────────────────────
# Products (Apps)
# ─────────────────────────────────────────────────────────────────────────────

products:
${productsYaml}

# ─────────────────────────────────────────────────────────────────────────────
# Shared Features (across all products)
# ─────────────────────────────────────────────────────────────────────────────

shared_features:
${config.features.map((f) => `  - ${f}`).join("\n")}

# ─────────────────────────────────────────────────────────────────────────────
# Integration Providers
# ─────────────────────────────────────────────────────────────────────────────

providers:
${providersYaml}

# ─────────────────────────────────────────────────────────────────────────────
# Security Configuration
# ─────────────────────────────────────────────────────────────────────────────

security:
  rls_enabled: true
  app_scoped_routes: true
  branded_validators: true
`
}
