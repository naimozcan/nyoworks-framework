# @nyoworks/feature-i18n

NYOWORKS i18n Feature - Internationalization support with database-backed translations and next-intl integration.

## Features

- Database-backed translations (PostgreSQL + Drizzle ORM)
- Multi-tenant support
- Namespace-based organization
- Locale management with default locale support
- React hooks for frontend integration
- tRPC router for API access
- Import/Export functionality
- RTL language detection

## Installation

```bash
pnpm add @nyoworks/feature-i18n
```

## Database Schema

The feature provides two tables:

### translations

| Column    | Type      | Description                    |
|-----------|-----------|--------------------------------|
| id        | uuid      | Primary key                    |
| tenantId  | uuid      | Tenant identifier              |
| locale    | text      | Locale code (e.g., "en", "tr") |
| namespace | text      | Namespace (default: "common")  |
| key       | text      | Translation key                |
| value     | text      | Translation value              |
| createdAt | timestamp | Creation timestamp             |
| updatedAt | timestamp | Last update timestamp          |

### locales

| Column     | Type      | Description                 |
|------------|-----------|-----------------------------|
| id         | uuid      | Primary key                 |
| tenantId   | uuid      | Tenant identifier           |
| code       | text      | Locale code (e.g., "en")    |
| name       | text      | Display name                |
| nativeName | text      | Native name (e.g., "Turk")  |
| isDefault  | text      | Is default locale           |
| isEnabled  | text      | Is locale enabled           |
| createdAt  | timestamp | Creation timestamp          |

## Usage

### tRPC Router

```typescript
import { i18nRouter } from "@nyoworks/feature-i18n/router"

export const appRouter = router({
  i18n: i18nRouter,
})
```

### React Hooks

```typescript
import { useTranslation, useLocale, useLocales } from "@nyoworks/feature-i18n"

function MyComponent() {
  const { t, isLoading } = useTranslation({ namespace: "common" })
  const { locale, setLocale } = useLocale()
  const { locales } = useLocales()

  return (
    <div>
      <h1>{t("welcome.title")}</h1>
      <p>{t("welcome.message", { name: "User" })}</p>

      <select value={locale} onChange={(e) => setLocale(e.target.value)}>
        {locales.map((l) => (
          <option key={l.code} value={l.code}>
            {l.nativeName}
          </option>
        ))}
      </select>
    </div>
  )
}
```

### Translation with Interpolation

```typescript
const { t } = useTranslation()

t("greeting", { name: "John" })
t("items.count", { count: 5 })
t("missing.key", "Default Value")
```

## next-intl Integration

This feature is designed to work alongside next-intl. Use the database for dynamic/user-managed translations and next-intl for static translations.

### Recommended Setup

1. Use next-intl for static UI translations (buttons, labels, navigation)
2. Use @nyoworks/feature-i18n for dynamic content (CMS, user-generated content)

### Syncing with next-intl

Export translations from the database and generate next-intl JSON files:

```typescript
import { i18nRouter } from "@nyoworks/feature-i18n/router"

const translations = await caller.i18n.translations.export({
  locale: "en",
  format: "json",
})
```

### next-intl Configuration

```typescript
import { getRequestConfig } from "next-intl/server"

export default getRequestConfig(async ({ locale }) => ({
  messages: {
    ...(await import(`./messages/${locale}.json`)).default,
  },
}))
```

## API Reference

### Locales

| Procedure       | Type     | Description               |
|-----------------|----------|---------------------------|
| locales.list    | query    | List all locales          |
| locales.create  | mutation | Create a new locale       |
| locales.update  | mutation | Update a locale           |
| locales.delete  | mutation | Delete a locale           |
| locales.getDefault | query | Get the default locale    |

### Translations

| Procedure                | Type     | Description                    |
|--------------------------|----------|--------------------------------|
| translations.get         | query    | Get translations by namespace  |
| translations.getOne      | query    | Get a single translation       |
| translations.add         | mutation | Add a translation              |
| translations.update      | mutation | Update a translation           |
| translations.delete      | mutation | Delete a translation           |
| translations.bulkAdd     | mutation | Bulk add translations          |
| translations.list        | query    | List translations with filters |
| translations.listNamespaces | query | List available namespaces      |
| translations.export      | query    | Export translations            |
| translations.import      | mutation | Import translations            |

## Hooks Reference

### useTranslation

```typescript
const {
  t,           // Translation function
  exists,      // Check if key exists
  translations, // Raw translations object
  isLoading,
  error,
  locale,
  namespace,
  refetch,
} = useTranslation({
  namespace: "common",
  locale: "en",
  fallbackLocale: "en",
})
```

### useLocale

```typescript
const {
  locale,     // Current locale
  setLocale,  // Change locale
  isLoading,
  error,
} = useLocale({
  defaultLocale: "en",
  storageKey: "nyoworks_locale",
})
```

### useLocales

```typescript
const {
  locales,          // Available locales
  isLoading,
  error,
  fetchLocales,
  getDefaultLocale,
} = useLocales({
  enabledOnly: true,
})
```

### useTranslationAdmin

```typescript
const {
  items,
  total,
  isLoading,
  error,
  fetchTranslations,
  addTranslation,
  updateTranslation,
  deleteTranslation,
} = useTranslationAdmin({
  locale: "en",
  namespace: "common",
  limit: 50,
})
```

## Utilities

```typescript
import { formatLocale, parseLocale, isRTL } from "@nyoworks/feature-i18n"

formatLocale("en-us")  // "en-US"
parseLocale("en-US")   // { language: "en", region: "US" }
isRTL("ar")            // true
isRTL("en")            // false
```

## License

MIT
