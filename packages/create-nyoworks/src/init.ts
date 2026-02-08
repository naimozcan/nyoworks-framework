import prompts from "prompts"
import pc from "picocolors"
import fs from "fs-extra"
import path from "path"
import os from "os"
import { execa } from "execa"
import { replacePlaceholders } from "./replace.js"
import { checkDependencies, showClaudeMaxWarning, getDockerComposeCommand } from "./checks.js"

const REPO = "naimozcan/nyoworks-framework"
const BRANCH = "main"

const AVAILABLE_FEATURES = [
  { title: "Analytics", value: "analytics", description: "User behavior tracking" },
  { title: "CRM", value: "crm", description: "Customer relationship management" },
  { title: "Payments", value: "payments", description: "Stripe integration" },
  { title: "Notifications", value: "notifications", description: "Email, SMS, Push" },
  { title: "Appointments", value: "appointments", description: "Booking system" },
  { title: "Audit", value: "audit", description: "Activity logging" },
  { title: "Export", value: "export", description: "PDF/CSV export" },
  { title: "Realtime", value: "realtime", description: "WebSocket support" },
]

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

export async function createProject(projectName?: string) {
  console.log()
  console.log(pc.cyan(pc.bold("  NYOWORKS Framework")))
  console.log(pc.dim("  Create a new project"))
  console.log()

  const response = await prompts([
    {
      type: projectName ? null : "text",
      name: "name",
      message: "Project name:",
      initial: projectName || "my-project",
      validate: (value) => (value.length > 0 ? true : "Project name is required"),
    },
    {
      type: "multiselect",
      name: "platforms",
      message: "Select platforms:",
      choices: AVAILABLE_PLATFORMS,
      min: 1,
      hint: "- Space to select. Return to submit",
      instructions: false,
    },
    {
      type: "multiselect",
      name: "features",
      message: "Select features:",
      choices: AVAILABLE_FEATURES,
      hint: "- Space to select. Return to submit",
      instructions: false,
    },
    {
      type: "select",
      name: "language",
      message: "Agent response language:",
      choices: AVAILABLE_LANGUAGES,
      initial: 0,
    },
  ])

  if (!response.name && !projectName) {
    console.log(pc.red("Aborted."))
    process.exit(1)
  }

  const name = response.name || projectName!
  const code = generateCode(name)
  const slug = generateSlug(name)
  const databaseName = generateDatabaseName(name)
  const platforms: string[] = response.platforms || ["web"]
  const features: string[] = response.features || []
  const language: string = response.language || "tr"

  const targetDir = path.resolve(process.cwd(), slug)

  if (fs.existsSync(targetDir)) {
    console.log(pc.red(`Directory ${slug} already exists.`))
    process.exit(1)
  }

  console.log()
  process.stdout.write(pc.cyan("Downloading from GitHub..."))

  let repoDir: string
  try {
    repoDir = await downloadRepo(REPO, BRANCH)
    console.log(pc.green(" done"))
  } catch (error) {
    console.log(pc.red(" failed"))
    console.error(pc.red("Failed to download from GitHub. Check your internet connection."))
    process.exit(1)
  }

  process.stdout.write(pc.dim("  Copying files..."))

  await fs.ensureDir(targetDir)

  const corePaths = [
    "packages/api",
    "packages/api-client",
    "packages/database",
    "packages/validators",
    "packages/shared",
    "packages/ui",
    "packages/assets",
    "apps/server",
    "docs",
    "mcp-server",
    ".claude",
  ]

  for (const p of corePaths) {
    const src = path.join(repoDir, p)
    const dest = path.join(targetDir, p)
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest)
    }
  }

  for (const platform of platforms) {
    const src = path.join(repoDir, `apps/${platform}`)
    const dest = path.join(targetDir, `apps/${platform}`)
    if (await fs.pathExists(src)) {
      await fs.copy(src, dest)
    }
  }

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

  await fs.remove(path.dirname(repoDir))

  console.log(pc.green(" done"))

  const placeholders: Record<string, string> = {
    "${PROJECT_NAME}": name,
    "${PROJECT_CODE}": code,
    "${PROJECT_SLUG}": slug,
    "${DATABASE_NAME}": databaseName,
    "${RESPONSE_LANGUAGE}": LANGUAGE_RESPONSES[language] || "Turkish",
  }

  process.stdout.write(pc.dim("  Replacing placeholders..."))
  await replacePlaceholders(targetDir, placeholders)
  console.log(pc.green(" done"))

  for (const feature of features) {
    const featureDoc = path.join(targetDir, "docs", "bible", "features", `${feature}.md`)
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

  const configPath = path.join(targetDir, "nyoworks.config.yaml")
  if (await fs.pathExists(configPath)) {
    let config = await fs.readFile(configPath, "utf8")
    if (features.length > 0) {
      config = config.replace(
        /enabled: \[\]/,
        `enabled:\n${features.map((f) => `    - ${f}`).join("\n")}`
      )
    }
    config = config.replace(
      /targets:\n    - web/,
      `targets:\n${platforms.map((p) => `    - ${p}`).join("\n")}`
    )
    await fs.writeFile(configPath, config)
  }

  console.log()
  console.log(pc.green(pc.bold("Project created successfully!")))

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
  console.log(pc.dim(`    Platforms: ${platforms.join(", ")}`))
  console.log(pc.dim(`    Features: ${features.join(", ") || "none"}`))
  console.log(pc.dim(`    Language: ${LANGUAGE_RESPONSES[language] || "Turkish"}`))
  console.log()

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
