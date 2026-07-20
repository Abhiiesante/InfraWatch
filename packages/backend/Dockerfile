# Backend Dockerfile - Production

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy monorepo files
COPY package*.json ./
COPY packages/backend/package.json packages/backend/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN npm ci --only=production

# Build application
COPY packages/backend packages/backend
COPY packages/shared packages/shared
COPY tsconfig.json ./

RUN cd packages/backend && npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application from builder
COPY --from=builder /app/packages/backend/dist dist
COPY --from=builder /app/packages/backend/node_modules node_modules
COPY --from=builder /app/packages/backend/package.json package.json
COPY packages/backend/.env.example .env.example

# Prisma dependencies
COPY --from=builder /app/packages/backend/node_modules/.prisma node_modules/.prisma
COPY packages/backend/prisma prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
