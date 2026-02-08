# @nyoworks/feature-subscriptions

Subscriptions feature for NYOWORKS projects - plan management, subscription lifecycle, and usage tracking.

## Features

- Plan management (CRUD)
- Subscription lifecycle (subscribe, cancel, resume, change plan)
- Usage tracking and limits
- Trial period support
- Multi-tenant support

## Installation

This feature is automatically included when you select "Subscriptions" during project setup.

## Environment Variables

No additional environment variables required for basic subscription functionality.

## Usage

### Schema

Import and add to your database schema:

```typescript
import { plans, userSubscriptions, usageRecords } from "@nyoworks/feature-subscriptions/schema"

export const schema = {
  ...otherTables,
  plans,
  userSubscriptions,
  usageRecords,
}
```

### Router

Add to your tRPC router:

```typescript
import { subscriptionsRouter } from "@nyoworks/feature-subscriptions/router"

export const appRouter = router({
  subscriptions: subscriptionsRouter,
})
```

### Hooks

Use in React components:

```tsx
import { usePlans, useSubscription, useUsage, useLimit } from "@nyoworks/feature-subscriptions"

function PricingPage() {
  const { plans, fetchPlans, isLoading } = usePlans({ activeOnly: true })
  const { subscribe, subscription } = useSubscription()

  useEffect(() => {
    fetchPlans()
  }, [])

  return (
    <div className="grid grid-cols-3 gap-4">
      {plans.map(plan => (
        <div key={plan.id} className="border rounded p-4">
          <h3>{plan.name}</h3>
          <p>${plan.price / 100}/{plan.interval}</p>
          <ul>
            {plan.features.map(feature => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
          <button
            onClick={() => subscribe(plan.id)}
            disabled={subscription?.planId === plan.id}
          >
            {subscription?.planId === plan.id ? "Current Plan" : "Select"}
          </button>
        </div>
      ))}
    </div>
  )
}

function UsageDashboard() {
  const { usage, fetchUsage, getUsagePercentage } = useUsage()
  const { limit, checkLimit, canUse } = useLimit("api_calls")

  useEffect(() => {
    fetchUsage()
    checkLimit()
  }, [])

  return (
    <div>
      {usage.map(record => (
        <div key={record.id}>
          <span>{record.feature}</span>
          <progress value={record.used} max={record.limit} />
          <span>{record.used} / {record.limit}</span>
        </div>
      ))}

      <button disabled={!canUse} onClick={() => makeApiCall()}>
        Make API Call ({canUse ? "allowed" : "limit reached"})
      </button>
    </div>
  )
}
```

## API Endpoints

### Plans

- `GET /api/subscriptions/plans` - List plans
- `GET /api/subscriptions/plans/:id` - Get plan
- `POST /api/subscriptions/plans` - Create plan (admin)
- `PATCH /api/subscriptions/plans/:id` - Update plan (admin)
- `DELETE /api/subscriptions/plans/:id` - Delete plan (admin)

### Subscriptions

- `GET /api/subscriptions/current` - Get current subscription
- `POST /api/subscriptions/subscribe` - Create subscription
- `POST /api/subscriptions/cancel` - Cancel subscription
- `POST /api/subscriptions/resume` - Resume canceled subscription
- `POST /api/subscriptions/change-plan` - Change subscription plan

### Usage

- `GET /api/subscriptions/usage` - Get usage records
- `GET /api/subscriptions/usage/check` - Check if limit allows action
- `POST /api/subscriptions/usage/record` - Record usage
- `POST /api/subscriptions/usage/reset` - Reset usage (admin)

## Plan Limits

Define limits in the plan's `limits` field:

```typescript
const plan = {
  name: "Pro",
  slug: "pro",
  price: 2900,
  interval: "month",
  features: ["Unlimited projects", "API access", "Priority support"],
  limits: {
    projects: 100,
    api_calls: 10000,
    storage_mb: 5120,
    team_members: 10,
  },
}
```

## Checking Limits

Before performing an action, check if the user has remaining quota:

```typescript
const { canUse, remaining } = useLimit("api_calls")

if (!canUse) {
  showUpgradeModal()
  return
}

await performAction()
await recordUsage("api_calls", 1)
```
