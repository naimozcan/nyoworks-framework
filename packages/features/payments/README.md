# @nyoworks/feature-payments

Stripe payment integration for NYOWORKS projects.

## Features

- Checkout sessions
- Billing portal
- Subscription management
- Invoice history
- Webhook handling

## Installation

This feature is automatically included when you select "Payments" during project setup.

## Environment Variables

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...
```

## Usage

### Schema

Import and add to your database schema:

```typescript
import { customers, subscriptions, invoices, paymentMethods } from "@nyoworks/feature-payments/schema"

export const schema = {
  ...otherTables,
  customers,
  subscriptions,
  invoices,
  paymentMethods,
}
```

### Router

Add to your tRPC router:

```typescript
import { paymentsRouter } from "@nyoworks/feature-payments/router"

export const appRouter = router({
  payments: paymentsRouter,
})
```

### Hooks

Use in React components:

```tsx
import { useCheckout, useSubscription, usePlans } from "@nyoworks/feature-payments"

function PricingPage() {
  const { plans, fetchPlans } = usePlans()
  const { createCheckout, isLoading } = useCheckout()

  useEffect(() => {
    fetchPlans()
  }, [])

  return (
    <div>
      {plans.map(plan => (
        <button
          key={plan.id}
          onClick={() => createCheckout({
            priceId: plan.id,
            successUrl: "/success",
            cancelUrl: "/cancel",
          })}
          disabled={isLoading}
        >
          {plan.name} - ${plan.unitAmount / 100}/mo
        </button>
      ))}
    </div>
  )
}
```

## Webhook Setup

Set up Stripe webhook endpoint at `/api/webhooks/stripe` to receive events.
