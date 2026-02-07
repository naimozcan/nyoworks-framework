# Layout Architecture

## Layout Types

| Layout | Path | Purpose | Auth |
|--------|------|---------|------|
| Root | `app/[locale]/layout.tsx` | Providers, i18n, theme, fonts | - |
| Auth | `app/[locale]/(auth)/layout.tsx` | Login, register, reset | No auth |
| App | `app/[locale]/(app)/layout.tsx` | Dashboard, sidebar, nav | Required |
| Marketing | `app/[locale]/(marketing)/layout.tsx` | Landing, pricing, about | Optional |
| Standalone | `app/[locale]/(standalone)/layout.tsx` | Poll embed, share links | No auth |

## Rules

1. Layouts are set up by architect during FRONTEND.INFRA sub-phase
2. Frontend developers NEVER modify layout files
3. Pages go inside route groups under the correct layout
4. If a layout change is needed, request it from /architect

## Route Groups

```
app/[locale]/
  (auth)/          # Auth layout
    login/
    register/
    reset-password/
  (app)/           # App layout (authenticated)
    dashboard/
    polls/
    surveys/
    settings/
  (marketing)/     # Marketing layout
    page.tsx       # Landing page
    pricing/
    about/
  (standalone)/    # Standalone layout (no nav)
    embed/[id]/
    share/[id]/
```

## Provider Stack (Root Layout)

1. ThemeProvider (next-themes)
2. QueryClientProvider (TanStack Query)
3. NextIntlClientProvider (i18n)
4. AuthProvider (session context)
5. Toaster (sonner)
