# UI Components

## Design System

### Colors

Using CSS variables for theme support:

```css
--primary: #1a1a1a (light) / #fafafa (dark)
--background: #ffffff (light) / #0a0a0a (dark)
--foreground: #0a0a0a (light) / #fafafa (dark)
```

### Typography

- **Headings:** Inter, sans-serif
- **Body:** Inter, sans-serif
- **Mono:** JetBrains Mono, monospace

### Spacing

Using Tailwind scale: 0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 16...

## Core Components

### Button

```tsx
<Button variant="default|destructive|outline|secondary|ghost|link" size="default|sm|lg|icon">
  Click me
</Button>
```

### Input

```tsx
<Input type="text|email|password" placeholder="Enter value" />
```

### Card

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

## Page Layouts

### Auth Layout

```
┌─────────────────────────────────────────┐
│              Logo                        │
│                                          │
│  ┌─────────────────────────────────┐    │
│  │         Form Card               │    │
│  │                                 │    │
│  │  Email: [____________]          │    │
│  │  Password: [__________]         │    │
│  │                                 │    │
│  │  [    Submit Button    ]        │    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                          │
└─────────────────────────────────────────┘
```

### Dashboard Layout

```
┌─────────┬───────────────────────────────┐
│         │          Header               │
│         ├───────────────────────────────┤
│         │                               │
│ Sidebar │         Content               │
│         │                               │
│         │                               │
│         │                               │
└─────────┴───────────────────────────────┘
```

## Page Specifications

[Add specs for each page]
