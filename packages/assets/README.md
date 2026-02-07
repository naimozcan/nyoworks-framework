# @nyoworks/assets

Centralized asset management for all applications.

## Structure

```
src/
├── images/          # Logo, backgrounds, illustrations
│   ├── logo.png
│   ├── logo-dark.png
│   └── ...
├── icons/           # Custom SVG icons (if not using Lucide)
│   └── ...
└── fonts/           # Custom fonts (if any)
    └── ...
```

## Usage

```tsx
// In apps/web or apps/mobile
import logo from "@nyoworks/assets/images/logo.png"
import logoDark from "@nyoworks/assets/images/logo-dark.png"
```

## Notes

- For icons, prefer Lucide React (`lucide-react`) over custom SVGs
- Images should be optimized before adding (use tools like squoosh.app)
- Keep total asset size under 2MB for optimal performance
