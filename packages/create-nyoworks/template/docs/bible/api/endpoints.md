# API Endpoints

## Base URL

```
Development: http://localhost:3001
Production:  https://api.${DOMAIN}
```

## Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

## Core Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Create tenant + owner |
| POST | /auth/login | No | Login, get tokens |
| POST | /auth/refresh | No | Refresh access token |
| POST | /auth/logout | Yes | Invalidate session |
| GET | /auth/profile | Yes | Get current user |

### Users

| Method | Path | Auth | Permission | Description |
|--------|------|------|------------|-------------|
| GET | /users | Yes | users:read | List users |
| GET | /users/:id | Yes | users:read | Get user |
| POST | /users | Yes | users:create | Create/invite user |
| PATCH | /users/:id | Yes | users:update | Update user |
| DELETE | /users/:id | Yes | users:delete | Soft delete user |

### Roles

| Method | Path | Auth | Permission | Description |
|--------|------|------|------------|-------------|
| GET | /roles | Yes | roles:read | List roles |
| GET | /roles/:id | Yes | roles:read | Get role |
| POST | /roles | Yes | roles:create | Create role |
| PATCH | /roles/:id | Yes | roles:update | Update role |
| DELETE | /roles/:id | Yes | roles:delete | Delete role |

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Success with Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": { ... }
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

## Feature Endpoints

[Add endpoints for each enabled feature]
