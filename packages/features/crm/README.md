# @nyoworks/feature-crm

CRM (Customer Relationship Management) feature for NYOWORKS projects.

## Features

- Contact management (CRUD)
- Tags and categorization
- Notes and activity logging
- Deal pipeline management
- Activity tracking (calls, emails, meetings)

## Installation

This feature is automatically included when you select "CRM" during project setup.

## Environment Variables

No additional environment variables required for basic CRM functionality.

## Usage

### Schema

Import and add to your database schema:

```typescript
import { contacts, tags, contactTags, notes, activities, deals } from "@nyoworks/feature-crm/schema"

export const schema = {
  ...otherTables,
  contacts,
  tags,
  contactTags,
  notes,
  activities,
  deals,
}
```

### Router

Add to your tRPC router:

```typescript
import { crmRouter } from "@nyoworks/feature-crm/router"

export const appRouter = router({
  crm: crmRouter,
})
```

### Hooks

Use in React components:

```tsx
import { useContacts, useDeals, usePipeline } from "@nyoworks/feature-crm"

function ContactsPage() {
  const { contacts, fetchContacts, createContact, isLoading } = useContacts()

  useEffect(() => {
    fetchContacts()
  }, [])

  return (
    <div>
      {contacts.map(contact => (
        <div key={contact.id}>
          {contact.firstName} {contact.lastName}
        </div>
      ))}
    </div>
  )
}

function PipelinePage() {
  const { pipeline, fetchPipeline } = usePipeline()
  const { deals, fetchDeals, updateDealStage } = useDeals()

  useEffect(() => {
    fetchPipeline()
    fetchDeals()
  }, [])

  return (
    <div className="grid grid-cols-6 gap-4">
      {["lead", "qualified", "proposal", "negotiation", "won", "lost"].map(stage => (
        <div key={stage}>
          <h3>{stage}</h3>
          <p>{pipeline[stage]?.count || 0} deals</p>
          <p>${pipeline[stage]?.totalValue || 0}</p>
        </div>
      ))}
    </div>
  )
}
```

## API Endpoints

### Contacts
- `GET /api/crm/contacts` - List contacts
- `POST /api/crm/contacts` - Create contact
- `GET /api/crm/contacts/:id` - Get contact
- `PATCH /api/crm/contacts/:id` - Update contact
- `DELETE /api/crm/contacts/:id` - Delete contact

### Tags
- `GET /api/crm/tags` - List tags
- `POST /api/crm/tags` - Create tag
- `DELETE /api/crm/tags/:id` - Delete tag

### Notes
- `GET /api/crm/contacts/:id/notes` - List contact notes
- `POST /api/crm/contacts/:id/notes` - Create note

### Activities
- `GET /api/crm/activities` - List activities
- `POST /api/crm/activities` - Create activity
- `PATCH /api/crm/activities/:id` - Update activity

### Deals
- `GET /api/crm/deals` - List deals
- `POST /api/crm/deals` - Create deal
- `PATCH /api/crm/deals/:id` - Update deal
- `GET /api/crm/deals/pipeline` - Get pipeline summary
