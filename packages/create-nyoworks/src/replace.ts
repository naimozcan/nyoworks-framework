import fs from "fs-extra"
import path from "path"

const EXTENSIONS = [".md", ".json", ".yaml", ".yml", ".ts", ".tsx", ".js", ".jsx", ".env", ".example"]
const IGNORE_DIRS = ["node_modules", ".git", "dist", ".next", ".turbo"]

export async function replacePlaceholders(
  dir: string,
  placeholders: Record<string, string>
): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.includes(entry.name)) {
        await replacePlaceholders(fullPath, placeholders)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name)
      if (EXTENSIONS.includes(ext) || entry.name.startsWith(".env")) {
        let content = await fs.readFile(fullPath, "utf8")
        let modified = false

        for (const [placeholder, value] of Object.entries(placeholders)) {
          if (content.includes(placeholder)) {
            content = content.split(placeholder).join(value)
            modified = true
          }
        }

        if (modified) {
          await fs.writeFile(fullPath, content)
        }
      }
    }
  }
}
