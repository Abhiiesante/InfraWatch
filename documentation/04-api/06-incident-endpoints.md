# Incident Endpoints

> **IEKB Section:** 04 — API Contracts  
> **Document:** 06-incident-endpoints.md  
> **Last Updated:** 2026-07-16  
> **Owner:** API Architect  
> **Status:** Approved

---

## Table of Contents

1. [Incident Core Endpoints](#incident-core-endpoints)
2. [Incident Assignment](#incident-assignment)
3. [Incident Comments](#incident-comments)
4. [Related Documents](#related-documents)

---

## Incident Core Endpoints

### GET /api/v1/incidents
Retrieves a paginated list of incidents.

**Security:** `JWT` (Any Role)

#### Query Parameters
- `page`, `limit`
- `assetId` (number)
- `assignedToId` (number)
- `reportedById` (number)
- `status` (enum: OPEN, ACKNOWLEDGED, IN_PROGRESS, RESOLVED, CLOSED)
- `severity` (enum: LOW, MEDIUM, HIGH, CRITICAL)
- `sortBy` (default: createdAt), `sortOrder` (default: desc)

#### Responses
**200 OK**
```json
{
  "items": [
    {
      "id": 890,
      "title": "Water leak on East pipe",
      "severity": "HIGH",
      "status": "OPEN",
      "asset": { "id": 101, "name": "Cooling Tower Alpha" },
      "reportedBy": { "id": 2, "name": "Rajesh Patel" },
      "assignedTo": null,
      "createdAt": "2026-07-16T10:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### POST /api/v1/incidents
Reports a new incident manually.

**Security:** `JWT` (Any Role)

#### Request Body
```json
{
  "assetId": 101,
  "title": "Water leak on East pipe",
  "description": "Steady drip from the main intake valve joint.",
  "severity": "HIGH"
}
```

#### Responses
**201 Created** (Returns the full created incident object. Internally triggers background notifications.)

---

### PATCH /api/v1/incidents/:id/status
Updates the status of an incident, enforcing strict state machine transitions.

**Security:** `JWT` (Any Role)

#### Request Body
```json
{
  "status": "IN_PROGRESS"
}
```

#### Responses
**200 OK** (Returns the updated incident object)

**400 Bad Request**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Cannot transition incident from OPEN to RESOLVED"
  }
}
```

---

## Incident Assignment

### PATCH /api/v1/incidents/:id/assign
Assigns an incident to a user. This automatically transitions the incident to `IN_PROGRESS` if it was `OPEN` or `ACKNOWLEDGED`.

**Security:** `JWT` (ADMIN, MANAGER)

#### Request Body
```json
{
  "assignedToId": 3
}
```

#### Responses
**200 OK** (Returns the updated incident object)

---

## Incident Comments

### GET /api/v1/incidents/:id/comments
Retrieves all comments for a specific incident, ordered chronologically (oldest first).

**Security:** `JWT` (Any Role)

#### Responses
**200 OK**
```json
[
  {
    "id": 12,
    "content": "I'm heading out to inspect the valve now.",
    "createdAt": "2026-07-16T10:30:00Z",
    "user": {
      "name": "Jane Doe",
      "role": "MANAGER",
      "avatarUrl": "https://..."
    }
  }
]
```

---

### POST /api/v1/incidents/:id/comments
Adds a comment to an incident.

**Security:** `JWT` (Any Role)

#### Request Body
```json
{
  "content": "Replaced the O-ring. Monitoring for further leaks."
}
```

#### Responses
**201 Created** (Returns the created comment object)

---

## Related Documents

- **Service:** [Incident Service](../03-backend/09-incident-service.md)
- **Database:** [Incident Table](../01-database/09-incident-table.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
