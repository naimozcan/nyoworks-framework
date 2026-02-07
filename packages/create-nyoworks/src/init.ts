import prompts from "prompts"
import pc from "picocolors"
import fs from "fs-extra"
import path from "path"
import { fileURLToPath } from "url"
import { execa } from "execa"
import { replacePlaceholders } from "./replace.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
  const platforms = response.platforms || ["web"]
  const features = response.features || []

  const targetDir = path.resolve(process.cwd(), slug)

  if (fs.existsSync(targetDir)) {
    console.log(pc.red(`Directory ${slug} already exists.`))
    process.exit(1)
  }

  console.log()
  console.log(pc.cyan("Creating project..."))

  const templateDir = path.resolve(__dirname, "..", "template")
  fs.copySync(templateDir, targetDir)

  console.log(pc.green("  Copied template files"))

  const platformsToRemove = AVAILABLE_PLATFORMS
    .map((p) => p.value)
    .filter((p) => !platforms.includes(p))

  for (const platform of platformsToRemove) {
    const platformDir = path.join(targetDir, "apps", platform)
    if (fs.existsSync(platformDir)) {
      fs.removeSync(platformDir)
      console.log(pc.dim(`  Removed apps/${platform}/`))
    }
  }

  const placeholders = {
    "${PROJECT_NAME}": name,
    "${PROJECT_CODE}": code,
    "${PROJECT_SLUG}": slug,
    "${DATABASE_NAME}": databaseName,
  }

  await replacePlaceholders(targetDir, placeholders)
  console.log(pc.green("  Replaced placeholders"))

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
    fs.outputFileSync(featureDoc, content)
    console.log(pc.dim(`  Created docs/bible/features/${feature}.md`))
  }

  const configPath = path.join(targetDir, "nyoworks.config.yaml")
  if (fs.existsSync(configPath)) {
    let config = fs.readFileSync(configPath, "utf8")
    config = config.replace(
      /enabled: \[\]/,
      `enabled:\n${features.map((f: string) => `    - ${f}`).join("\n") || "    []"}`
    )
    config = config.replace(
      /targets:\n    - web/,
      `targets:\n${platforms.map((p: string) => `    - ${p}`).join("\n")}`
    )
    fs.writeFileSync(configPath, config)
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
