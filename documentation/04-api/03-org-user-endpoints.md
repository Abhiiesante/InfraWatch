# Organization & User Endpoints

> **IEKB Section:** 04 — API Contracts  
> **Document:** 03-org-user-endpoints.md  
> **Last Updated:** 2026-07-16  
> **Owner:** API Architect  
> **Status:** Approved

---

## Organizations

### POST /api/v1/organizations/register
Provisions a new tenant, default settings, and the initial Admin user.

**Security:** Public

#### Request Body
```json
{
  "companyName": "Acme Corp",
  "domain": "acme.com",
  "adminName": "Jane Doe",
  "adminEmail": "jane@acme.com",
  "adminPassword": "SecurePassword123!",
  "timezone": "America/New_York"
}
```

#### Responses
**201 Created**
```json
{
  "message": "Organization provisioned successfully",
  "organization": { "id": 4, "name": "Acme Corp" },
  "admin": { "id": 12, "email": "jane@acme.com" }
}
```

---

### GET /api/v1/organizations/me/settings
Retrieves the settings for the currently authenticated tenant.

**Security:** `JWT` (Any Role)

#### Responses
**200 OK**
```json
{
  "timezone": "America/New_York",
  "notificationConfig": {
    "email": true,
    "slack": false
  }
}
```

---

### PATCH /api/v1/organizations/me/settings
Updates the settings for the current tenant.

**Security:** `JWT` (ADMIN Only)

#### Request Body
```json
{
  "notificationConfig": {
    "email": true,
    "slack": true,
    "slack_webhook_url": "https://hooks.slack.com/..."
  }
}
```

#### Responses
**200 OK** (Returns the updated settings object)

---

## Users

### GET /api/v1/users
Retrieves a paginated list of users within the current tenant.

**Security:** `JWT` (ADMIN, MANAGER)

#### Query Parameters
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string, optional) - Searches name and email
- `role` (string, optional)

#### Responses
**200 OK**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@acme.com",
      "role": "ADMIN",
      "isActive": true,
      "lastLoginAt": "2026-07-16T10:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### POST /api/v1/users
Invites/Creates a new user in the current tenant.

**Security:** `JWT` (ADMIN Only)

#### Request Body
```json
{
  "name": "John Smith",
  "email": "john@acme.com",
  "role": "INSPECTOR",
  "password": "TemporaryPassword123!" 
}
```
*(Note: In V1.1, password will be removed in favor of email invite links)*

#### Responses
**201 Created**
```json
{
  "id": 13,
  "name": "John Smith",
  "email": "john@acme.com",
  "role": "INSPECTOR"
}
```

**409 Conflict**
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Email already registered in this organization"
  }
}
```

---

### DELETE /api/v1/users/:id
Deactivates a user (Soft Delete).

**Security:** `JWT` (ADMIN Only)

#### Responses
**200 OK**
```json
{
  "message": "User deactivated successfully"
}
```

**409 Conflict** (If attempting to deactivate the last admin)
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Cannot deactivate the last admin in the organization"
  }
}
```

---

## Related Documents

- **Service:** [Organization Service](../03-backend/04-org-service.md)
- **Service:** [User Service](../03-backend/05-user-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
