# @nyoworks/feature-notifications

Multi-channel notification system for NYOWORKS projects.

## Features

- Email notifications (Resend)
- SMS notifications (Twilio)
- Push notifications (FCM)
- In-app notifications
- Notification templates with variable substitution
- User notification preferences
- Quiet hours support
- Scheduled notifications

## Installation

This feature is automatically included when you select "Notifications" during project setup.

## Environment Variables

```env
# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Push (Firebase Cloud Messaging)
FCM_SERVER_KEY=...
```

## Usage

### Schema

Import and add to your database schema:

```typescript
import {
  notifications,
  notificationTemplates,
  notificationPreferences,
  pushDevices,
  emailLogs,
} from "@nyoworks/feature-notifications/schema"

export const schema = {
  ...otherTables,
  notifications,
  notificationTemplates,
  notificationPreferences,
  pushDevices,
  emailLogs,
}
```

### Router

Add to your tRPC router:

```typescript
import { notificationsRouter } from "@nyoworks/feature-notifications/router"

export const appRouter = router({
  notifications: notificationsRouter,
})
```

### Hooks

Use in React components:

```tsx
import {
  useNotifications,
  useNotificationPreferences,
  usePushNotifications,
  useSendNotification,
  useToast,
} from "@nyoworks/feature-notifications"

function NotificationCenter() {
  const { notifications, unreadCount, fetchNotifications, markAsRead } = useNotifications()

  useEffect(() => {
    fetchNotifications()
  }, [])

  return (
    <div>
      <span>Unread: {unreadCount}</span>
      {notifications.map(notification => (
        <div key={notification.id} onClick={() => markAsRead(notification.id)}>
          <h4>{notification.subject}</h4>
          <p>{notification.body}</p>
        </div>
      ))}
    </div>
  )
}

function SendNotificationForm() {
  const { sendEmail, sendInApp, isLoading } = useSendNotification()
  const { success, error } = useToast()

  const handleSend = async () => {
    try {
      await sendEmail({
        to: "user@example.com",
        subject: "Welcome!",
        body: "Welcome to our platform.",
      })
      success("Email sent successfully")
    } catch (err) {
      error("Failed to send email")
    }
  }

  return (
    <button onClick={handleSend} disabled={isLoading}>
      Send Welcome Email
    </button>
  )
}
```

### Templates

Create reusable notification templates:

```typescript
await trpc.notifications.templates.create.mutate({
  name: "Welcome Email",
  slug: "welcome-email",
  channel: "email",
  subject: "Welcome to {{appName}}, {{userName}}!",
  body: "Hi {{userName}}, thanks for joining {{appName}}.",
  htmlBody: "<h1>Welcome {{userName}}!</h1><p>Thanks for joining {{appName}}.</p>",
  variables: ["appName", "userName"],
})

await trpc.notifications.send.email.mutate({
  to: "user@example.com",
  subject: "",
  body: "",
  templateId: "template-uuid",
  templateData: {
    appName: "MyApp",
    userName: "John",
  },
})
```

## API Endpoints

### Send
- `POST /api/notifications/send/email` - Send email
- `POST /api/notifications/send/sms` - Send SMS
- `POST /api/notifications/send/push` - Send push notification
- `POST /api/notifications/send/in-app` - Send in-app notification

### Templates
- `GET /api/notifications/templates` - List templates
- `POST /api/notifications/templates` - Create template
- `PATCH /api/notifications/templates/:id` - Update template
- `DELETE /api/notifications/templates/:id` - Delete template

### User Notifications
- `GET /api/notifications` - List user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read

### Preferences
- `GET /api/notifications/preferences` - Get preferences
- `PATCH /api/notifications/preferences` - Update preferences

### Devices
- `POST /api/notifications/devices` - Register push device
- `DELETE /api/notifications/devices` - Unregister device
