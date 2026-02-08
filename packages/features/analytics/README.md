# @nyoworks/feature-analytics

Analytics and user metrics tracking for NYOWORKS projects.

## Features

- Event tracking
- Pageview tracking
- Session management
- User identification
- Query API for dashboards
- Time-based aggregations

## Installation

This feature is automatically included when you select "Analytics" during project setup.

## Environment Variables

No additional environment variables required for basic analytics.

Optional integrations:
```env
# PostHog (optional)
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://app.posthog.com

# Plausible (optional)
PLAUSIBLE_DOMAIN=yourdomain.com
```

## Usage

### Schema

Import and add to your database schema:

```typescript
import {
  analyticsEvents,
  analyticsPageviews,
  analyticsSessions,
} from "@nyoworks/feature-analytics/schema"

export const schema = {
  ...otherTables,
  analyticsEvents,
  analyticsPageviews,
  analyticsSessions,
}
```

### Router

Add to your tRPC router:

```typescript
import { analyticsRouter } from "@nyoworks/feature-analytics/router"

export const appRouter = router({
  analytics: analyticsRouter,
})
```

### Hooks

Use in React components:

```tsx
import {
  useAnalytics,
  usePageview,
  useTrackEvent,
  useAnalyticsQuery,
} from "@nyoworks/feature-analytics"

function App() {
  const { track, identify, sessionId } = useAnalytics()

  const handleButtonClick = () => {
    track("button_clicked", {
      properties: { buttonId: "signup", location: "header" }
    })
  }

  const handleLogin = (user) => {
    identify({
      userId: user.id,
      email: user.email,
      plan: user.plan,
    })
  }

  return <button onClick={handleButtonClick}>Sign Up</button>
}

function AnalyticsDashboard() {
  const { fetchEventCounts, fetchTopPages, isLoading } = useAnalyticsQuery()
  const [data, setData] = useState([])

  useEffect(() => {
    const loadData = async () => {
      const counts = await fetchEventCounts({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        groupBy: "day",
      })
      setData(counts)
    }
    loadData()
  }, [])

  return (
    <div>
      {data.map(item => (
        <div key={item.date}>
          {item.date}: {item.count} events
        </div>
      ))}
    </div>
  )
}
```

### Automatic Pageview Tracking

Pageviews are tracked automatically when using `useAnalytics`. To disable:

```tsx
const { track } = useAnalytics({ autoTrackPageviews: false })
```

## API Endpoints

### Tracking (Public)
- `POST /api/analytics/track/event` - Track custom event
- `POST /api/analytics/track/pageview` - Track pageview
- `POST /api/analytics/track/identify` - Identify user

### Sessions
- `POST /api/analytics/session` - Create session
- `PATCH /api/analytics/session` - Update session
- `GET /api/analytics/session/:id` - Get session

### Query (Protected)
- `GET /api/analytics/query/event-counts` - Event counts by time
- `GET /api/analytics/query/top-events` - Top events
- `GET /api/analytics/query/top-pages` - Top pages
- `GET /api/analytics/query/pageview-counts` - Pageview counts
- `GET /api/analytics/query/unique-users` - Unique user count
- `GET /api/analytics/query/session-stats` - Session statistics
