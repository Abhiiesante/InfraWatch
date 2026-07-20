# API Design Principles

> **IEKB Section:** 04 — API Contracts  
> **Document:** 00-api-design-principles.md  
> **Last Updated:** 2026-07-16  
> **Owner:** API Architect  
> **Status:** Approved

---

## Table of Contents

1. [RESTful Resource Naming](#restful-resource-naming)
2. [HTTP Methods](#http-methods)
3. [Standardized Responses](#standardized-responses)
4. [Error Responses](#error-responses)
5. [Versioning Strategy](#versioning-strategy)
6. [Pagination & Filtering](#pagination--filtering)
7. [Related Documents](#related-documents)

---

## RESTful Resource Naming

InfraWatch APIs follow strict RESTful conventions using plural nouns for resource collections. Actions that don't neatly fit into CRUD operations are handled via sub-resources or explicit action verbs.

| Resource | URI Pattern | Description |
|----------|-------------|-------------|
| **Collection** | `/api/v1/assets` | Plural noun, refers to the entire collection. |
| **Instance** | `/api/v1/assets/:id` | Specific entity within the collection. |
| **Sub-Collection** | `/api/v1/assets/:id/cameras` | Resources strictly owned by the parent resource. |
| **Action** | `/api/v1/inspections/:id/complete` | Explicit action endpoint when standard PUT/PATCH is insufficient. |

### Anti-Patterns to Avoid
- ❌ `/api/v1/getAssets` (No verbs in paths)
- ❌ `/api/v1/asset` (Use plural `assets`)
- ❌ `/api/v1/assets/:id/cameras/:id/status` (Avoid deeply nested paths; use `/api/v1/cameras/:id/status` instead)

---

## HTTP Methods

We adhere to the standard semantic meaning of HTTP verbs.

| Method | Idempotent | Usage in InfraWatch |
|--------|------------|---------------------|
| **GET** | Yes | Read data. Never mutates state. Safe to cache. |
| **POST** | No | Create new resources or execute complex non-idempotent actions (e.g., login). |
| **PUT** | Yes | Full replacement of a resource. (Rarely used in V0, prefer PATCH). |
| **PATCH**| No* | Partial update of a resource. Send only the fields changing. |
| **DELETE**| Yes | Soft-delete a resource. |

*\*PATCH is technically not idempotent if the operation depends on current state, but in our implementation, sending the same PATCH payload twice yields the same final state.*

---

## Standardized Responses

To simplify frontend data fetching, all successful API responses follow predictable shapes.

### Single Resource (200 OK / 201 Created)
Returns the resource object directly. No wrapping `{"data": ...}` envelope for single items.

```json
{
  "id": 142,
  "name": "Tower T-142",
  "status": "ACTIVE"
}
```

### Collection / Paginated (200 OK)
Collections are **always** wrapped in a pagination envelope, even if the collection is small.

```json
{
  "items": [
    { "id": 1, "name": "Asset A" },
    { "id": 2, "name": "Asset B" }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## Error Responses

All errors (4xx, 5xx) follow a strict standardized envelope. The frontend can safely assume `error.code` and `error.message` will always exist on a non-2xx response.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "name", "message": "String must contain at least 3 character(s)" }
    ]
  }
}
```

See [Backend Error Handling](../03-backend/02-error-handling.md) for the implementation details.

---

## Versioning Strategy

APIs evolve. To prevent breaking external integrations or mobile clients (future), we version the API in the URL path.

- **Current Version:** `/api/v1/`
- **When to bump to V2:** Breaking changes to response schemas, removal of endpoints, or fundamental paradigm shifts (e.g., switching from REST to GraphQL).
- **When NOT to bump:** Adding new endpoints, adding new optional fields to existing responses, adding new query parameters.

---

## Pagination & Filtering

All `GET` collection endpoints support standardized query parameters.

- `?page=1`: Page number (1-indexed). Default: 1.
- `?limit=20`: Items per page. Default: 20. Max: 100.
- `?search=query`: Global text search across relevant fields.
- `?sortBy=createdAt`: Field to sort by.
- `?sortOrder=desc`: Direction (`asc` or `desc`).

Resource-specific filters are appended using exact field names:
- `?status=ACTIVE&typeId=3`

See [Pagination & Filtering](../03-backend/13-pagination-filtering.md) for backend implementation.

---

## Related Documents

- **Next:** [OpenAPI Specification](./01-openapi-spec.md)
- **Backend Implementation:** [Backend Overview](../03-backend/00-backend-overview.md)
- **Frontend Usage:** [API Integration](../05-frontend/01-project-setup.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
