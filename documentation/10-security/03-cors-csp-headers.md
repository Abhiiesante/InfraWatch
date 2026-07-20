# CORS & Security Headers (Helmet)

> **IEKB Section:** 11 — Security  
> **Document:** 03-cors-csp-headers.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [CORS Configuration](#cors-configuration)
3. [Helmet & CSP](#helmet--csp)
4. [Related Documents](#related-documents)

---

## Overview

The browser relies on HTTP headers sent by the server to enforce security policies on the client-side. We must explicitly configure the Express backend to send the correct headers to prevent Cross-Site Scripting (XSS), Clickjacking, and unauthorized Cross-Origin Resource Sharing (CORS).

---

## CORS Configuration

By default, web browsers block frontend code running on `domain-a.com` from making API requests to `domain-b.com`. Because our API and Frontend operate on different subdomains (or completely different domains in dev), we must configure CORS.

```typescript
// src/middlewares/cors.middleware.ts
import cors from 'cors';

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://app.infrawatch.com'] // Strict production origin
  : ['http://localhost:5173']; // Local Vite dev server

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl) 
    // OR if the origin is explicitly in the allowed list
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Required to allow cookies (Refresh Token) to be sent cross-origin
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
```

---

## Helmet & CSP

We use the `helmet` package to automatically set a secure baseline of HTTP headers.

Most importantly, we configure a strict **Content Security Policy (CSP)**. A CSP tells the browser exactly which domains are allowed to execute scripts or load images on the page, neutralizing the vast majority of XSS attacks.

```typescript
// src/app.ts
import helmet from 'helmet';

// Apply Helmet before all routes
app.use(helmet());

// Custom CSP for InfraWatch
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      // Allow scripts only from our domain
      scriptSrc: ["'self'"],
      // Allow connecting to our API and AWS S3 buckets (for images)
      connectSrc: ["'self'", process.env.API_URL, "https://infrawatch-assets-production.s3.amazonaws.com"],
      imgSrc: ["'self'", "data:", "https://infrawatch-assets-production.s3.amazonaws.com"],
      // Prevent the app from being embedded in iframes (prevents Clickjacking)
      frameAncestors: ["'none'"],
    },
  })
);
```

---

## Related Documents

- **Architecture:** [Security Overview](./00-security-overview.md)
- **API Setup:** [Express Architecture](../03-backend/00-express-architecture.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
