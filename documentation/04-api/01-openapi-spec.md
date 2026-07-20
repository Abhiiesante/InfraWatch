# OpenAPI Specification Strategy

> **IEKB Section:** 04 — API Contracts  
> **Document:** 01-openapi-spec.md  
> **Last Updated:** 2026-07-16  
> **Owner:** API Architect  
> **Status:** Approved

---

## Table of Contents

1. [Code-First Approach](#code-first-approach)
2. [Tsoa Integration](#tsoa-integration)
3. [Swagger UI Deployment](#swagger-ui-deployment)
4. [Client Generation](#client-generation)
5. [Related Documents](#related-documents)

---

## Code-First Approach

In InfraWatch, the API documentation is generated directly from the TypeScript source code (Controllers and Interfaces) rather than maintaining a massive, brittle YAML file by hand. This ensures the documentation is always 100% in sync with the actual implementation.

We use **Tsoa** (TypeScript OpenAPI) to achieve this. Tsoa reads standard JSDoc comments and TypeScript types to generate the OpenAPI 3.0 specification (`swagger.json`) and the Express route bindings automatically.

---

## Tsoa Integration

### Controller Example

By decorating the controller class and methods, Tsoa infers the routing, expected payload types, and security requirements.

```typescript
// src/modules/assets/asset.controller.ts
import { Route, Get, Post, Body, Query, Path, Security, Tags, Response } from 'tsoa';
import { AssetService } from './asset.service';
import type { CreateAssetDto, AssetListOptions, PaginatedResult } from './asset.schema';

@Route('api/v1/assets')
@Tags('Assets')
export class AssetController {
  
  /**
   * Retrieves a paginated list of assets for the current tenant.
   * 
   * @param page Page number (default: 1)
   * @param limit Items per page (default: 20)
   * @param status Filter by asset status
   */
  @Get()
  @Security('jwt', ['ADMIN', 'MANAGER', 'INSPECTOR'])
  @Response(401, 'Unauthorized')
  public async listAssets(
    @Query() page?: number,
    @Query() limit?: number,
    @Query() status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'
  ): Promise<PaginatedResult<any>> {
    // Note: Tsoa generates the routing layer that calls this method.
    // The actual execution logic remains the same.
    return assetService.list(1, { page, limit, status }); // TenantId hardcoded for example
  }

  /**
   * Creates a new physical asset.
   */
  @Post()
  @Security('jwt', ['ADMIN', 'MANAGER'])
  @Response(400, 'Validation Error')
  @Response(403, 'Forbidden (Inspector role cannot create)')
  public async createAsset(
    @Body() requestBody: CreateAssetDto
  ): Promise<any> {
    return assetService.create(1, 1, requestBody);
  }
}
```

### tsoa.json Configuration

```json
{
  "entryFile": "src/server.ts",
  "noImplicitAdditionalProperties": "throw-on-extras",
  "spec": {
    "outputDirectory": "build",
    "specVersion": 3,
    "securityDefinitions": {
      "jwt": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  },
  "routes": {
    "routesDir": "src/routes",
    "authenticationModule": "src/middleware/tsoa-auth.ts"
  }
}
```

---

## Swagger UI Deployment

The generated `swagger.json` is served by the backend itself in development and staging environments using `swagger-ui-express`.

```typescript
// src/app.ts
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from '../build/swagger.json';

// Mount Swagger UI on /docs
if (env.NODE_ENV !== 'production') {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
```

Developers can navigate to `http://localhost:3000/docs` to see the interactive API documentation, authorize with a JWT, and execute test queries directly from the browser.

---

## Client Generation

In the future, the OpenAPI specification will be used to automatically generate frontend API clients and TypeScript types using `openapi-typescript-codegen` or RTK Query's OpenAPI generator. 

For V0, we rely on manual interface sharing via the monorepo `packages/types` directory, but the OpenAPI spec serves as the definitive source of truth for third-party integrations.

---

## Related Documents

- **Previous:** [API Design Principles](./00-api-design-principles.md)
- **Next:** [Auth Endpoints](./02-auth-endpoints.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
