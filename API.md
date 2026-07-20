# API Documentation - InfraWatch

Complete REST API reference for InfraWatch asset monitoring platform.

## Base URL

```
http://localhost:3000/api
```

## Authentication

All endpoints (except `/auth/register` and `/auth/login`) require a Bearer token in the Authorization header:

```
Authorization: Bearer <accessToken>
```

Multi-tenant operations also require:

```
x-tenant-id: <organizationId>
```

Token expiration and refresh:
- **Access Token**: 15 minutes
- **Refresh Token**: 7 days

## Error Responses

All errors follow this format:

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

Common HTTP status codes:
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Duplicate/constraint violation
- `500 Internal Server Error` - Unexpected error

## Authentication Endpoints

### Register

Create new organization and admin user.

```
POST /auth/register
Content-Type: application/json
```

**Request:**
```json
{
  "email": "admin@company.com",
  "password": "SecurePass123",
  "name": "John Doe",
  "organizationName": "Acme Corp"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "name": "John Doe",
    "role": "ADMIN",
    "tenantId": 1
  },
  "organization": {
    "id": 1,
    "name": "Acme Corp",
    "plan": "STARTER"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Login

Authenticate and get tokens.

```
POST /auth/login
Content-Type: application/json
```

**Request:**
```json
{
  "email": "user@company.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "user": { ... },
  "organization": { ... },
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

### Refresh Token

Get new access token using refresh token.

```
POST /auth/refresh
Content-Type: application/json
Authorization: Bearer <refreshToken>
```

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Logout

Invalidate tokens.

```
POST /auth/logout
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

## Organization Endpoints

### Get Current Organization

```
GET /organizations/current
Authorization: Bearer <accessToken>
x-tenant-id: <organizationId>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Acme Corp",
  "domain": "acme.infrawatch.com",
  "plan": "PROFESSIONAL",
  "logoUrl": "https://...",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

---

### Get Organization Statistics

```
GET /organizations/current/stats
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "userCount": 5,
  "assetCount": 12,
  "incidentCount": 3
}
```

---

### Update Organization

Requires `ADMIN` role.

```
PUT /organizations/current
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "New Name",
  "domain": "newdomain.infrawatch.com",
  "plan": "ENTERPRISE"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "New Name",
  ...
}
```

---

## User Endpoints

### List Users

```
GET /users?skip=0&take=20
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `skip` (default: 0) - Pagination offset
- `take` (default: 20) - Page size

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@company.com",
      "name": "John Doe",
      "role": "ADMIN",
      "isActive": true,
      "lastLoginAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5,
  "skip": 0,
  "take": 20
}
```

---

### Get User

```
GET /users/:id
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@company.com",
  "name": "John Doe",
  "role": "MANAGER",
  "phone": "+1234567890",
  "isActive": true
}
```

---

### Create User

Requires `ADMIN` role.

```
POST /users
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "email": "newuser@company.com",
  "password": "SecurePass123",
  "name": "Jane Smith",
  "role": "MANAGER",
  "phone": "+1987654321"
}
```

**Response (201 Created):**
```json
{
  "id": 6,
  "email": "newuser@company.com",
  "name": "Jane Smith",
  "role": "MANAGER"
}
```

---

### Update User

Requires `ADMIN` role or own user ID.

```
PUT /users/:id
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Updated Name",
  "phone": "+1111111111"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Updated Name",
  "phone": "+1111111111",
  ...
}
```

---

### Delete User

Requires `ADMIN` role. Soft-deactivates user.

```
DELETE /users/:id
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "message": "User deactivated"
}
```

---

## Asset Endpoints

### List Assets

```
GET /assets?skip=0&take=20
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `skip` (default: 0) - Pagination
- `take` (default: 20) - Page size

**Response (200 OK):**
```json
{
  "assets": [
    {
      "id": 1,
      "name": "Tower Alpha-01",
      "description": "Main tower in sector 1",
      "assetType": {
        "id": 1,
        "name": "Communication Tower"
      },
      "status": "ACTIVE",
      "latitude": 40.7128,
      "longitude": -74.006,
      "address": "123 Main St, NYC",
      "metadata": {
        "height": 150,
        "installDate": "2023-01-15"
      }
    }
  ],
  "total": 12,
  "skip": 0,
  "take": 20
}
```

---

### Get Asset

```
GET /assets/:id
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "Tower Alpha-01",
  "assetType": { ... },
  "cameras": [
    {
      "id": 1,
      "name": "Main Camera",
      "cameraType": "PTZ HD",
      "status": "ONLINE"
    }
  ],
  ...
}
```

---

### Create Asset

Requires `MANAGER` or `ADMIN` role.

```
POST /assets
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Tower Beta-02",
  "description": "Secondary tower",
  "assetTypeId": 1,
  "latitude": 40.758,
  "longitude": -73.985,
  "address": "456 5th Ave, NYC",
  "metadata": {
    "height": 120,
    "manufacturer": "Tower Solutions Inc"
  }
}
```

**Response (201 Created):**
```json
{
  "id": 2,
  "name": "Tower Beta-02",
  ...
}
```

---

### Update Asset

Requires `MANAGER` or `ADMIN` role.

```
PUT /assets/:id
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "description": "Updated description",
  "status": "MAINTENANCE"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "description": "Updated description",
  ...
}
```

---

### Delete Asset

Requires `MANAGER` or `ADMIN` role. Soft deletes (sets `deletedAt`).

```
DELETE /assets/:id
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "message": "Asset deleted"
}
```

---

## Incident Endpoints

### List Incidents

```
GET /incidents?skip=0&take=20&status=OPEN&severity=HIGH
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `skip` (default: 0)
- `take` (default: 20)
- `status` (optional) - OPEN, INVESTIGATING, RESOLVED, CLOSED
- `severity` (optional) - LOW, MEDIUM, HIGH, CRITICAL

**Response (200 OK):**
```json
{
  "incidents": [
    {
      "id": 1,
      "title": "Tower Sway Detected",
      "description": "Unusual movement detected",
      "severity": "HIGH",
      "status": "INVESTIGATING",
      "asset": { "id": 1, "name": "Tower Alpha-01" },
      "reporter": {
        "id": 1,
        "name": "John Doe",
        "email": "john@company.com"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 3,
  "skip": 0,
  "take": 20
}
```

---

### Get Incident

```
GET /incidents/:id
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "title": "Tower Sway Detected",
  "asset": { ... },
  "reporter": { ... },
  "assignments": [
    {
      "id": 1,
      "user": {
        "id": 2,
        "name": "Jane Smith"
      }
    }
  ],
  "comments": [
    {
      "id": 1,
      "author": { "id": 1, "name": "John Doe" },
      "content": "Initial assessment complete",
      "createdAt": "2024-01-15T10:35:00Z"
    }
  ],
  ...
}
```

---

### Create Incident

Any authenticated user can create incidents.

```
POST /incidents
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "title": "Power Loss Detected",
  "description": "Complete power outage in sector 2",
  "assetId": 2,
  "severity": "CRITICAL"
}
```

**Response (201 Created):**
```json
{
  "id": 4,
  "title": "Power Loss Detected",
  "severity": "CRITICAL",
  "status": "OPEN",
  "reporter": { "id": 1, "name": "John Doe" },
  ...
}
```

---

### Update Incident

Requires `MANAGER` or `ADMIN` role.

```
PUT /incidents/:id
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "status": "RESOLVED",
  "severity": "MEDIUM",
  "description": "Issue has been resolved"
}
```

**Response (200 OK):**
```json
{
  "id": 1,
  "status": "RESOLVED",
  ...
}
```

---

### Assign Incident

Requires `MANAGER` or `ADMIN` role.

```
POST /incidents/:id/assign
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "userId": 2
}
```

**Response (200 OK):**
```json
{
  "message": "Incident assigned"
}
```

---

### Add Comment

Any authenticated user can add comments.

```
POST /incidents/:id/comments
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "content": "I've investigated the issue. Root cause is..."
}
```

**Response (201 Created):**
```json
{
  "id": 5,
  "content": "I've investigated the issue...",
  "author": { "id": 1, "name": "John Doe" },
  "createdAt": "2024-01-15T10:45:00Z"
}
```

---

## Inspection Endpoints

### List Inspections

```
GET /inspections?skip=0&take=20&assetId=1
Authorization: Bearer <accessToken>
```

**Query Parameters:**
- `skip` (default: 0)
- `take` (default: 20)
- `assetId` (optional) - Filter by asset

**Response (200 OK):**
```json
{
  "inspections": [
    {
      "id": 1,
      "asset": { "id": 1, "name": "Tower Alpha-01" },
      "inspector": { "id": 1, "name": "John Doe" },
      "scheduledDate": "2024-01-20T09:00:00Z",
      "status": "SCHEDULED",
      "notes": "Routine quarterly inspection",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 5,
  "skip": 0,
  "take": 20
}
```

---

### Get Inspection

```
GET /inspections/:id
Authorization: Bearer <accessToken>
```

**Response (200 OK):**
```json
{
  "id": 1,
  "asset": { ... },
  "inspector": { ... },
  "inspectionImages": [
    {
      "id": 1,
      "imageUrl": "https://...",
      "caption": "Tower structure"
    }
  ],
  "status": "COMPLETED",
  "completedAt": "2024-01-20T14:30:00Z",
  ...
}
```

---

### Create Inspection

Requires `MANAGER` or `ADMIN` role.

```
POST /inspections
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "assetId": 1,
  "inspectorId": 2,
  "scheduledDate": "2024-01-25",
  "notes": "Post-maintenance inspection"
}
```

**Response (201 Created):**
```json
{
  "id": 6,
  "assetId": 1,
  "inspectorId": 2,
  "status": "SCHEDULED",
  ...
}
```

---

### Update Inspection

```
PUT /inspections/:id
Authorization: Bearer <accessToken>
Content-Type: application/json
```

**Request:**
```json
{
  "status": "COMPLETED",
  "completedAt": "2024-01-25T14:30:00Z",
  "notes": "Inspection completed. All systems nominal."
}
```

**Response (200 OK):**
```json
{
  "id": 6,
  "status": "COMPLETED",
  ...
}
```

---

## Rate Limiting

Current limits (per user, per minute):
- Unauthenticated requests: 60
- Authenticated requests: 300
- Admin endpoints: 150

Rate limit headers in response:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1705325460
```

---

## Pagination

Paginated endpoints support:
- `skip` (default: 0) - Number of items to skip
- `take` (default: 20) - Number of items to return (max: 100)

Response format:
```json
{
  "data": [...],
  "total": 42,
  "skip": 0,
  "take": 20
}
```

---

## Field Validation Rules

### User
- `email`: Valid email format, unique per tenant
- `password`: Minimum 8 characters
- `name`: 2-255 characters
- `phone`: Valid phone format (optional)
- `role`: ADMIN | MANAGER | INSPECTOR | OPERATOR

### Asset
- `name`: 2-255 characters
- `assetTypeId`: Valid asset type ID
- `latitude`: -90 to 90
- `longitude`: -180 to 180

### Incident
- `title`: 5-255 characters
- `severity`: LOW | MEDIUM | HIGH | CRITICAL
- `status`: OPEN | INVESTIGATING | RESOLVED | CLOSED

### Inspection
- `assetId`: Valid asset ID
- `inspectorId`: Valid user ID
- `scheduledDate`: Valid date

---

## Examples

### Complete Flow: Register, Login, Create Incident

```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@mycompany.com",
    "password": "SecurePass123",
    "name": "John Admin",
    "organizationName": "My Company"
  }'

# Response includes accessToken and refreshToken

# 2. Create Incident (using token from step 1)
curl -X POST http://localhost:3000/api/incidents \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Critical System Failure",
    "description": "Main system is down",
    "severity": "CRITICAL"
  }'

# 3. Get Incidents
curl http://localhost:3000/api/incidents \
  -H "Authorization: Bearer <accessToken>"

# 4. Refresh Token (when access token expires)
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refreshToken>"}'
```

