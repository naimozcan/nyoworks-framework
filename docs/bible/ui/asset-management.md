# Asset Management

## Visual Element Libraries

NEVER write visual elements from scratch. Use approved libraries only.

| Category | Library | Source |
|----------|---------|--------|
| Charts | Recharts via shadcn/ui Charts | npm |
| Animations | Motion (Framer Motion) | npm |
| Effects | Magic UI, Aceternity UI | copy-paste |
| Backgrounds | Magic UI | copy-paste |
| Icons | Lucide React | npm |
| Loading | shadcn/ui Skeleton | built-in |
| Tables | TanStack Table via shadcn DataTable | npm |
| Lottie | dotlottie-react | npm |
| Forms | React Hook Form + Zod via shadcn Form | npm |

## MCP Tool

```
mcp__nyoworks__get_visual_guidance({category: "charts"})
```

## Theme Tokens

Theme tokens are defined in packages/ui/ and consumed by all apps.
Never hardcode colors, font sizes, or spacing values.
Use CSS variables from the theme system.

## Icon Guidelines

- Use Lucide React exclusively (1500+ icons, tree-shakable)
- Import icons individually: `import { Home } from "lucide-react"`
- Never use icon fonts or other icon libraries
- Custom icons: SVG in packages/ui/src/icons/

## Image Guidelines

- Use Next.js Image component for all images
- Store static assets in public/ directory
- Use CDN URLs for dynamic/uploaded content
- Always specify width, height, and alt text
- Use WebP format with AVIF fallback
