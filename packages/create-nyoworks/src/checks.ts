import pc from "picocolors"
import { execa } from "execa"

interface DependencyCheck {
  name: string
  cmd: string
  args?: string[]
  required: boolean
  minVersion?: string
  install?: string
  url?: string
}

const DEPENDENCIES: DependencyCheck[] = [
  {
    name: "Node.js",
    cmd: "node",
    args: ["-v"],
    required: true,
    minVersion: "20.0.0",
    url: "https://nodejs.org",
  },
  {
    name: "pnpm",
    cmd: "pnpm",
    args: ["-v"],
    required: true,
    install: "npm i -g pnpm",
  },
  {
    name: "Docker",
    cmd: "docker",
    args: ["-v"],
    required: true,
    url: "https://docker.com/download",
  },
  {
    name: "Claude CLI",
    cmd: "claude",
    args: ["-v"],
    required: false,
    install: "npm i -g @anthropic-ai/claude-code",
  },
  {
    name: "VS Code",
    cmd: "code",
    args: ["-v"],
    required: false,
    url: "https://code.visualstudio.com",
  },
]

async function checkCommand(cmd: string, args: string[] = []): Promise<string | null> {
  try {
    const result = await execa(cmd, args)
    return result.stdout.trim().replace(/^v/, "")
  } catch {
    return null
  }
}

function compareVersions(current: string, minimum: string): boolean {
  const curr = current.split(".").map(Number)
  const min = minimum.split(".").map(Number)

  for (let i = 0; i < 3; i++) {
    if ((curr[i] || 0) > (min[i] || 0)) return true
    if ((curr[i] || 0) < (min[i] || 0)) return false
  }
  return true
}

export async function checkDependencies(): Promise<void> {
  console.log()
  console.log(pc.cyan("Checking dependencies..."))

  let hasError = false

  for (const dep of DEPENDENCIES) {
    const version = await checkCommand(dep.cmd, dep.args)

    if (!version) {
      if (dep.required) {
        console.log(pc.red(`  ✗ ${dep.name} is required`))
        hasError = true
      } else {
        console.log(pc.yellow(`  ⚠ ${dep.name} (recommended)`))
      }
      if (dep.install) {
        console.log(pc.dim(`    Install: ${dep.install}`))
      }
      if (dep.url) {
        console.log(pc.dim(`    Download: ${dep.url}`))
      }
    } else {
      if (dep.minVersion && !compareVersions(version, dep.minVersion)) {
        console.log(pc.yellow(`  ⚠ ${dep.name} ${version} (minimum: ${dep.minVersion})`))
      } else {
        console.log(pc.green(`  ✓ ${dep.name} ${version}`))
      }
    }
  }

  if (hasError) {
    console.log()
    console.log(pc.red("Please install the required dependencies before continuing."))
  }
}

export function showClaudeMaxWarning(): void {
  console.log()
  console.log(pc.yellow("╔═══════════════════════════════════════════════════════════════════════╗"))
  console.log(pc.yellow("║") + pc.bold("  ⚠️  MCP Server requires Claude Max subscription                      ") + pc.yellow("║"))
  console.log(pc.yellow("╠═══════════════════════════════════════════════════════════════════════╣"))
  console.log(pc.yellow("║") + "                                                                       " + pc.yellow("║"))
  console.log(pc.yellow("║") + "  The AI agents in this framework use Model Context Protocol (MCP).    " + pc.yellow("║"))
  console.log(pc.yellow("║") + "  MCP requires Claude Max subscription.                                " + pc.yellow("║"))
  console.log(pc.yellow("║") + "                                                                       " + pc.yellow("║"))
  console.log(pc.yellow("║") + pc.bold("  Pricing: $100/month") + " (5x usage vs Pro)                                " + pc.yellow("║"))
  console.log(pc.yellow("║") + "  Subscribe: " + pc.cyan("https://claude.ai/settings/billing") + "                   " + pc.yellow("║"))
  console.log(pc.yellow("║") + "                                                                       " + pc.yellow("║"))
  console.log(pc.yellow("║") + "  Without Claude Max:                                                  " + pc.yellow("║"))
  console.log(pc.yellow("║") + pc.green("  ✓ You can still use the codebase manually") + "                           " + pc.yellow("║"))
  console.log(pc.yellow("║") + pc.red("  ✗ AI agents (/lead, /backend, /frontend, etc.) won't work") + "           " + pc.yellow("║"))
  console.log(pc.yellow("║") + pc.red("  ✗ MCP tools will not be available") + "                                   " + pc.yellow("║"))
  console.log(pc.yellow("║") + "                                                                       " + pc.yellow("║"))
  console.log(pc.yellow("╚═══════════════════════════════════════════════════════════════════════╝"))
}
