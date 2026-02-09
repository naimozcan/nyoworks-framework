# NYOWORKS Framework v3.0

> AI-orchestrated multi-product framework for building whitelabel SaaS applications (Netherlands-focused)

## Quick Start

```bash
npx create-nyoworks my-project
cd my-project
pnpm install
docker-compose up -d
pnpm dev
```

## What's New in v3.0

- **Multi-Product Support** - Create projects with multiple apps (ecommerce + crm + salon)
- **Per-Product Platform Selection** - Choose web/mobile/desktop for each product
- **Row-Level Security (RLS)** - Database isolation per tenant and app
- **App-Scoped API Routes** - `/api/ecommerce/*`, `/api/crm/*`, `/api/salon/*`
- **Branded Type Safety** - `EcommerceOrderId`, `CrmContactId`, `SalonAppointmentId`
- **Netherlands Integrations** - iDEAL/Mollie, PostNL, Peppol, WhatsApp Business

## 11 App Types

| App | Description | Platforms |
|-----|-------------|-----------|
| Corporate | Company website, landing page | Web, Mobile, Desktop |
| E-commerce | Online store with iDEAL/Mollie | Web, Mobile, Desktop |
| Booking | General appointment system | Web, Mobile |
| Salon | Hair salon, spa, beauty center | Web, Mobile |
| HR | Personnel, payroll, leave management | Web |
| ERP | Accounting, sales, purchasing | Web |
| WMS | Inventory, warehouse management | Web, Mobile |
| CMS | Blog, news, portal | Web |
| CRM | Sales pipeline, lead tracking | Web |
| TMS | Fleet, route, delivery tracking | Web, Mobile |
| Dashboard | Reporting, KPI, analytics | Web |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 22+ |
| Monorepo | Turborepo + pnpm 9.x |
| Backend | Hono |
| Frontend | Next.js 16 (App Router) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 (ioredis) |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Auth | JWT (jose) + Argon2id |
| Mobile | Expo SDK 54 + React Native 0.81 |
| Desktop | Tauri 2.0 |

## Netherlands Integrations

| Category | Provider | Description |
|----------|----------|-------------|
| Payments | Mollie / Adyen | iDEAL, credit card, Bancontact |
| Shipping | PostNL / SendCloud | National shipping, tracking |
| Invoicing | Peppol / UBL | B2B e-invoicing (2030 mandatory) |
| Communication | WhatsApp Business | Customer messaging, AI chatbot |
| Maps | Google Maps | Geocoding, routes |
| AI | Google Gemini | Chatbot, OCR, content generation |

## CLI Usage

```bash
# Create a new project
npx create-nyoworks my-company

# Multi-product selection
? Products (select multiple):
  ☑ E-commerce Platform
  ☑ Customer Relations (CRM)
  ☐ Salon Management

# Per-product platform selection
? E-commerce platforms:
  ☑ Web
  ☑ Mobile
  ☐ Desktop

? CRM platforms:
  ☑ Web
  ☐ Mobile
```

## Project Structure (Generated)

```
my-company/
├── apps/
│   ├── ecommerce/
│   │   ├── web/           # Next.js 16
│   │   └── mobile/        # Expo SDK 54
│   ├── crm/
│   │   └── web/           # Next.js 16
│   └── server/            # Hono API (unified)
├── packages/
│   ├── database/          # Drizzle + RLS
│   ├── api/               # tRPC routers
│   ├── validators/        # Zod + branded types
│   ├── shared/            # Utilities
│   ├── ui/                # shadcn/ui components
│   └── features/          # Optional modules
├── config/
│   └── apps.config.yaml   # Multi-product config
└── mcp-server/            # AI orchestration
```

## Security Architecture (v3.0)

### Row-Level Security
```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### App-Scoped Routes
```
/api/ecommerce/*  → EcommerceContext
/api/crm/*        → CrmContext
/api/salon/*      → SalonContext
```

### Branded Types
```typescript
// Compile-time safety - can't mix app IDs
const orderId: EcommerceOrderId = "order_123"
const contactId: CrmContactId = "contact_456"

// Error: Type 'CrmContactId' is not assignable to 'EcommerceOrderId'
processOrder(contactId)
```

## MCP Server (70+ Tools)

### Multi-App Tools (v3.0)
| Tool | Purpose |
|------|---------|
| `list_apps` | List all products in project |
| `select_app` | Switch active app context |
| `get_current_app` | Current app details |
| `get_app_tasks` | Tasks for specific app |
| `create_app_task` | Create task for app |
| `set_app_phase` | Set app workflow phase |
| `get_multi_app_summary` | Overall progress |

### Core Tools
| Tool | Purpose |
|------|---------|
| `get_status` | Project state overview |
| `create_task` / `update_task` | Task management |
| `claim_task` / `release_task` | Task locking |
| `advance_phase` / `rollback_phase` | Phase management |
| `create_handoff` / `acknowledge_handoff` | Agent context handoff |
| `create_spec` / `approve_spec` | Spec-driven development |

## AI Workflow (8 Agents)

```
DISCOVERY → ARCHITECTURE → DESIGN → PLANNING → BACKEND → FRONTEND → QA → DEPLOYMENT
    │           │            │          │          │          │       │        │
   lead      architect    designer    lead     backend   frontend    qa     devops
```

### Agent Commands
| Command | Role | Focus |
|---------|------|-------|
| `/lead` | Project Lead | Orchestration, sub-phases |
| `/architect` | System Architect | Design, cross-platform |
| `/backend` | Backend Developer | APIs, services |
| `/frontend` | Frontend Developer | UI, pages |
| `/designer` | UI/UX Designer | Specs, design system |
| `/data` | Database Engineer | Schemas, RLS |
| `/qa` | QA Engineer | Testing, security |
| `/devops` | DevOps Engineer | Docker, CI/CD |

## Recommended Templates

| Category | Template | License |
|----------|----------|---------|
| E-commerce | [Relivator](https://github.com/blefnk/relivator-nextjs-template) | MIT |
| CRM/Dashboard | [Shadboard](https://github.com/Qualiora/shadboard) | MIT |
| Booking | [Cal.com](https://github.com/calcom/cal.com) | AGPL |
| CMS | [Payload CMS](https://github.com/payloadcms/payload) | MIT |
| Analytics | [Umami](https://github.com/umami-software/umami) | MIT |

## Contributing

This is an internal framework by NYOWORKS. Contributions are welcome via pull requests.

## License

MIT License - Naim Yasir Ozcan (nyoworks)
