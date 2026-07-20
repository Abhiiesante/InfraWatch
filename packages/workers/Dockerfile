# Workers Dockerfile - Production

FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/workers/package.json packages/workers/

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY packages/workers packages/workers

# Build
RUN cd packages/workers && npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init
RUN apk add --no-cache dumb-init

# Copy from builder
COPY --from=builder /app/packages/workers/dist dist
COPY --from=builder /app/packages/workers/node_modules node_modules
COPY --from=builder /app/packages/workers/package.json package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
