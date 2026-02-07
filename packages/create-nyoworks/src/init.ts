import prompts from "prompts"
import pc from "picocolors"
import fs from "fs-extra"
import path from "path"
import { execa } from "execa"
import { replacePlaceholders } from "./replace.js"

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

async function downloadFromGitHub(repo: string, subPath: string, targetDir: string, branch: string = "main"): Promise<void> {
  const url = `https://codeload.github.com/${repo}/tar.gz/${branch}`
  const tempDir = path.join(targetDir, ".download-temp")

  await fs.ensureDir(tempDir)

  try {
    await execa("curl", ["-sL", url, "-o", `${tempDir}/repo.tar.gz`])

    await execa("tar", ["-xzf", `${tempDir}/repo.tar.gz`, "-C", tempDir])

    const extractedDir = path.join(tempDir, `nyoworks-framework-${branch}`)
    const sourcePath = subPath ? path.join(extractedDir, subPath) : extractedDir

    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetDir, { overwrite: true })
    }
  } finally {
    await fs.remove(tempDir)
  }
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

  const targetDir = path.resolve(process.cwd(), slug)

  if (fs.existsSync(targetDir)) {
    console.log(pc.red(`Directory ${slug} already exists.`))
    process.exit(1)
  }

  await fs.ensureDir(targetDir)

  console.log()
  console.log(pc.cyan("Downloading from GitHub..."))

  const coreItems = [
    { path: "packages/api", desc: "tRPC routers" },
    { path: "packages/api-client", desc: "API client" },
    { path: "packages/database", desc: "Database" },
    { path: "packages/validators", desc: "Validators" },
    { path: "packages/shared", desc: "Shared utils" },
    { path: "packages/ui", desc: "UI components" },
    { path: "packages/assets", desc: "Assets" },
    { path: "apps/server", desc: "API server" },
    { path: "docs", desc: "Documentation" },
    { path: "mcp-server", desc: "MCP server" },
    { path: ".claude", desc: "Agent commands" },
  ]

  const rootFiles = [
    "package.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    "tsconfig.json",
    ".env.example",
    ".gitignore",
    "nyoworks.config.yaml",
  ]

  for (const item of coreItems) {
    process.stdout.write(pc.dim(`  Downloading ${item.desc}...`))
    await downloadFromGitHub(REPO, item.path, path.join(targetDir, item.path), BRANCH)
    console.log(pc.green(" ✓"))
  }

  for (const platform of platforms) {
    process.stdout.write(pc.dim(`  Downloading apps/${platform}...`))
    await downloadFromGitHub(REPO, `apps/${platform}`, path.join(targetDir, `apps/${platform}`), BRANCH)
    console.log(pc.green(" ✓"))
  }

  process.stdout.write(pc.dim("  Downloading root files..."))
  await downloadFromGitHub(REPO, "", targetDir, BRANCH)

  const allPlatforms = ["web", "mobile", "desktop"]
  for (const platform of allPlatforms) {
    if (!platforms.includes(platform)) {
      const platformDir = path.join(targetDir, "apps", platform)
      if (await fs.pathExists(platformDir)) {
        await fs.remove(platformDir)
      }
    }
  }

  const createNyoworksDir = path.join(targetDir, "packages", "create-nyoworks")
  if (await fs.pathExists(createNyoworksDir)) {
    await fs.remove(createNyoworksDir)
  }
  console.log(pc.green(" ✓"))

  const placeholders: Record<string, string> = {
    "${PROJECT_NAME}": name,
    "${PROJECT_CODE}": code,
    "${PROJECT_SLUG}": slug,
    "${DATABASE_NAME}": databaseName,
  }

  process.stdout.write(pc.dim("  Replacing placeholders..."))
  await replacePlaceholders(targetDir, placeholders)
  console.log(pc.green(" ✓"))

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
  console.log()
  console.log("  Next steps:")
  console.log()
  console.log(pc.cyan(`    cd ${slug}`))
  console.log(pc.cyan("    pnpm install"))
  console.log(pc.cyan("    pnpm dev"))
  console.log()
  console.log(pc.dim("  Configuration:"))
  console.log(pc.dim(`    Name: ${name}`))
  console.log(pc.dim(`    Code: ${code}`))
  console.log(pc.dim(`    Platforms: ${platforms.join(", ")}`))
  console.log(pc.dim(`    Features: ${features.join(", ") || "none"}`))
  console.log()
}
