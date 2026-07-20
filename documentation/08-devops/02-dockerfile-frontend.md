# Frontend Dockerfile (Nginx)

> **IEKB Section:** 08 — DevOps  
> **Document:** 02-dockerfile-frontend.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Multi-Stage Nginx Build](#multi-stage-nginx-build)
3. [Nginx Configuration](#nginx-configuration)
4. [Dockerfile Source](#dockerfile-source)
5. [Related Documents](#related-documents)

---

## Overview

Unlike the backend which runs a persistent Node.js process, a React SPA just consists of static HTML, CSS, and JS files once built. 

In development, we use Vite's dev server. But for staging/production, we build the static bundle and serve it using a lightweight **Nginx** web server. (Note: While hosting directly on S3/CloudFront is usually cheaper, deploying Nginx in ECS alongside the backend provides a unified deployment pipeline for V0).

---

## Multi-Stage Nginx Build

Similar to the backend, we use a two-stage build:
- **Stage 1 (Builder):** Uses Node.js to install dependencies and run `npm run build` (Vite).
- **Stage 2 (Production):** Uses the official Nginx Alpine image, copies the output from Stage 1 into Nginx's `html` folder, and discards Node.js entirely.

---

## Nginx Configuration

Because we use React Router (Client-side routing), we must configure Nginx to route all 404 requests back to `index.html`. If we don't, users hitting `https://domain.com/assets` directly will get a 404 from Nginx instead of loading the React app.

```nginx
# frontend/nginx/default.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        # Try to serve file directly, fallback to index.html for React Router
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets forever (Vite hashes filenames so this is safe)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

---

## Dockerfile Source

```dockerfile
# frontend/Dockerfile

# -------------------------
# STAGE 1: Builder
# -------------------------
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Pass build-time environment variables (e.g. API URL)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build the Vite project (Outputs to dist/)
RUN npm run build

# -------------------------
# STAGE 2: Production Nginx
# -------------------------
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy our custom nginx config for React Router support
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy the built React app from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## Related Documents

- **Architecture:** [DevOps Overview](./00-devops-overview.md)
- **Frontend:** [Routing & Navigation](../05-frontend/03-routing-navigation.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
