# Frontend Dockerfile - Production

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/frontend/package.json packages/frontend/

# Install dependencies
RUN npm ci

# Copy source
COPY packages/frontend packages/frontend

# Build application
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN cd packages/frontend && npm run build

# Serve with nginx
FROM nginx:alpine

# Copy nginx config
COPY packages/frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built application
COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
