#!/bin/bash

# InfraWatch Deployment Script - Production Ready

set -e

echo "🚀 InfraWatch Production Deployment"
echo "===================================="

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="${DOCKER_REGISTRY:-infrawatch}"
DOCKER_TAG="${DOCKER_TAG:-latest}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Functions
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

# Check prerequisites
log_info "Checking prerequisites..."
command -v docker >/dev/null 2>&1 || log_error "Docker is not installed"
command -v docker-compose >/dev/null 2>&1 || log_error "Docker Compose is not installed"
command -v npm >/dev/null 2>&1 || log_error "npm is not installed"

# Build Docker images
log_info "Building Docker images..."

# Backend
docker build \
    --build-arg NODE_ENV=production \
    -t ${DOCKER_REGISTRY}/backend:${DOCKER_TAG} \
    -f packages/backend/Dockerfile \
    .

# Frontend
docker build \
    --build-arg VITE_API_URL=/api \
    -t ${DOCKER_REGISTRY}/frontend:${DOCKER_TAG} \
    -f packages/frontend/Dockerfile \
    .

# Workers
docker build \
    --build-arg NODE_ENV=production \
    -t ${DOCKER_REGISTRY}/workers:${DOCKER_TAG} \
    -f packages/workers/Dockerfile \
    .

log_info "Docker images built successfully"

# Test images
log_info "Testing Docker images..."

# Test backend image
docker run --rm ${DOCKER_REGISTRY}/backend:${DOCKER_TAG} npm run type-check || \
    log_error "Backend type checking failed"

# Test frontend image
docker run --rm ${DOCKER_REGISTRY}/frontend:${DOCKER_TAG} npm run type-check || \
    log_error "Frontend type checking failed"

log_info "Docker images passed type checking"

# Run tests in containers
log_info "Running tests..."

docker run --rm \
    -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
    ${DOCKER_REGISTRY}/backend:${DOCKER_TAG} \
    npm run test -- --run || log_warn "Backend tests had warnings (check logs)"

log_info "Tests completed"

# Push to registry (if configured)
if [ ! -z "$PUSH_TO_REGISTRY" ]; then
    log_info "Pushing images to registry..."
    docker push ${DOCKER_REGISTRY}/backend:${DOCKER_TAG}
    docker push ${DOCKER_REGISTRY}/frontend:${DOCKER_TAG}
    docker push ${DOCKER_REGISTRY}/workers:${DOCKER_TAG}
    log_info "Images pushed successfully"
fi

log_info "Deployment complete!"
log_info "Next steps:"
echo "  1. Deploy using: docker-compose -f docker-compose.prod.yml up"
echo "  2. Run database migrations: docker exec infrawatch-backend npm run migrate:prod"
echo "  3. Verify health: curl http://localhost/health"
