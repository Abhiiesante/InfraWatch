# Production Deployment Guide

Complete guide for deploying InfraWatch to production environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- AWS Account (for cloud deployment) or VPS with Docker
- Domain name
- SSL certificate (for HTTPS)

## Environment Setup

### 1. Create Production Environment File

Create `.env.production`:

```env
# Environment
NODE_ENV=production
ENVIRONMENT=production

# Database
DATABASE_URL=postgresql://infrawatch:$(STRONG_DB_PASSWORD)@db.example.com:5432/infrawatch_prod
DB_PASSWORD=<generate-strong-password>

# Redis
REDIS_URL=redis://:$(STRONG_REDIS_PASSWORD)@redis.example.com:6379
REDIS_PASSWORD=<generate-strong-password>

# JWT Secrets (Generate: openssl rand -base64 32)
JWT_SECRET=<generate-random-string>
JWT_REFRESH_SECRET=<generate-random-string>

# Frontend URL
FRONTEND_URL=https://yourcompany.infrawatch.com

# Frontend API URL
FRONTEND_API_URL=https://api.yourcompany.infrawatch.com

# Logging
LOG_LEVEL=info

# AWS (optional - for S3, SES)
AWS_REGION=us-east-1
AWS_S3_BUCKET=infrawatch-prod
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_SES_REGION=us-east-1
SENDER_EMAIL=noreply@infrawatch.yourcompany.com
```

### 2. Generate Secure Secrets

```bash
# Generate JWT secrets
openssl rand -base64 32  # Repeat twice for JWT_SECRET and JWT_REFRESH_SECRET

# Generate database password
openssl rand -base64 16

# Generate Redis password
openssl rand -base64 16
```

## Deployment Options

### Option A: Docker Compose (VPS/Self-Hosted)

#### 1. Prepare Server

```bash
# SSH into your server
ssh user@your-server.com

# Clone repository
git clone https://github.com/yourorg/infrawatch.git
cd infrawatch

# Create necessary directories
mkdir -p logs backup data/postgres data/redis
chmod 755 logs backup data
```

#### 2. Configure Environment

```bash
# Copy environment file
cp docker-compose.prod.yml.template docker-compose.prod.yml

# Edit with production values
nano docker-compose.prod.yml

# Create .env file with secrets
cat > .env << EOF
DB_PASSWORD=$(openssl rand -base64 16)
REDIS_PASSWORD=$(openssl rand -base64 16)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
FRONTEND_URL=https://yourcompany.infrawatch.com
FRONTEND_API_URL=https://api.yourcompany.infrawatch.com
EOF

# Make .env readable only by user
chmod 600 .env
```

#### 3. Deploy Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Wait for database to be ready
sleep 30

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npm run migrate:prod

# Verify all services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

#### 4. Configure Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/infrawatch > /dev/null << 'EOF'
upstream backend {
    server 127.0.0.1:3000;
}

upstream frontend {
    server 127.0.0.1:80;
}

server {
    listen 80;
    server_name infrawatch.yourcompany.com api.infrawatch.yourcompany.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.infrawatch.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/infrawatch.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/infrawatch.yourcompany.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name infrawatch.yourcompany.com;

    ssl_certificate /etc/letsencrypt/live/infrawatch.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/infrawatch.yourcompany.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/infrawatch /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Get SSL certificate
sudo certbot certonly --nginx -d infrawatch.yourcompany.com -d api.infrawatch.yourcompany.com

# Restart Nginx
sudo systemctl restart nginx

# Enable auto-renewal
sudo systemctl enable certbot.timer
```

#### 5. Setup Monitoring & Backups

```bash
# Daily database backup
cat > /home/user/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/infrawatch/backup"
docker-compose -f /path/to/infrawatch/docker-compose.prod.yml exec -T postgres pg_dump -U infrawatch infrawatch | gzip > $BACKUP_DIR/infrawatch_$DATE.sql.gz
find $BACKUP_DIR -name "infrawatch_*.sql.gz" -mtime +30 -delete
EOF

chmod +x /home/user/backup.sh

# Add to crontab
crontab -e
# Add line: 0 2 * * * /home/user/backup.sh
```

### Option B: AWS ECS (Recommended for Scale)

#### 1. Create RDS PostgreSQL

```bash
# Using AWS CLI
aws rds create-db-instance \
  --db-instance-identifier infrawatch-prod \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.3 \
  --master-username infrawatch \
  --master-user-password $(openssl rand -base64 16) \
  --allocated-storage 100 \
  --storage-type gp3 \
  --backup-retention-period 30
```

#### 2. Create ElastiCache Redis

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id infrawatch-redis \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --engine-version 7.0 \
  --port 6379 \
  --num-cache-nodes 1
```

#### 3. Push Images to ECR

```bash
# Create ECR repositories
aws ecr create-repository --repository-name infrawatch/backend
aws ecr create-repository --repository-name infrawatch/frontend
aws ecr create-repository --repository-name infrawatch/workers

# Build and push images
./scripts/deploy.sh

# Or manually:
docker build -t infrawatch-backend -f packages/backend/Dockerfile .
docker tag infrawatch-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/infrawatch/backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/infrawatch/backend:latest
```

#### 4. Create ECS Task Definitions

See documentation for detailed ECS setup.

## Post-Deployment

### 1. Verify Deployment

```bash
# Check health
curl https://api.infrawatch.yourcompany.com/health

# Check frontend
curl https://infrawatch.yourcompany.com/

# Verify database
docker-compose -f docker-compose.prod.yml exec backend npm run db:studio
```

### 2. Create Admin User

```bash
curl -X POST https://api.infrawatch.yourcompany.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "STRONG_PASSWORD",
    "name": "Admin",
    "organizationName": "Your Company"
  }'
```

### 3. Enable Monitoring

```bash
# Setup CloudWatch/Prometheus for:
# - API response times
# - Error rates
# - Database connections
# - Redis memory usage
# - Container health
```

### 4. Setup Alerting

Configure alerts for:
- High error rate (> 5%)
- API latency (> 1s)
- Database connection pool near limit
- Redis memory > 80%
- Container restarts > 2 per day
- SSL certificate expiration < 30 days

## Maintenance

### Database Backups

Automated daily backups stored in S3/backup volume.

Restore from backup:
```bash
gunzip < backup/infrawatch_20240115_020000.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres psql -U infrawatch infrawatch
```

### Log Rotation

Logs are automatically rotated by Docker.

View logs:
```bash
docker-compose -f docker-compose.prod.yml logs --tail 100 backend
```

### Zero-Downtime Deployments

```bash
# Build new images
docker build -t infrawatch/backend:v1.2.0 -f packages/backend/Dockerfile .

# Start new container on different port
docker run -p 3001:3000 infrawatch/backend:v1.2.0

# Test new version
curl http://localhost:3001/health

# Switch traffic (in Nginx)
# Update upstream to 3001, reload Nginx

# Stop old container
docker stop infrawatch-backend
```

## Security Checklist

- [ ] Database password is strong (16+ chars, mixed case, numbers, symbols)
- [ ] Redis password is strong and configured
- [ ] JWT secrets are random and secure (32+ chars)
- [ ] SSL/TLS certificates are valid and auto-renewing
- [ ] Firewall allows only necessary ports (80, 443)
- [ ] Database backups are encrypted
- [ ] Environment variables are not in version control
- [ ] Regular security updates for OS and Docker images
- [ ] Rate limiting is enabled on API
- [ ] CORS is configured for frontend domain only
- [ ] Audit logging is enabled
- [ ] Failed login attempts are monitored

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Verify environment variables
docker-compose -f docker-compose.prod.yml config | grep DATABASE_URL

# Check port conflicts
sudo lsof -i :3000

# Restart all services
docker-compose -f docker-compose.prod.yml restart
```

### Database connection fails

```bash
# Verify PostgreSQL is running
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check credentials in .env
cat .env | grep DATABASE

# Test connection
docker-compose -f docker-compose.prod.yml exec backend \
  npx prisma db execute --stdin < /dev/null
```

### High memory usage

```bash
# Check container stats
docker stats

# Optimize Node.js heap size
# In docker-compose.prod.yml, add:
# NODE_OPTIONS: --max-old-space-size=512

# Clear Redis cache
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHALL
```

## Scaling

### Horizontal Scaling (Multiple Instances)

1. Deploy backend on multiple containers
2. Use load balancer (AWS ALB, Nginx)
3. Use RDS for database (shared across instances)
4. Use ElastiCache for Redis (shared)

### Vertical Scaling (Larger Instances)

1. Update Docker Compose resource limits
2. Use larger RDS instance type
3. Use larger ElastiCache node type
4. Increase container memory/CPU limits

## Cost Optimization

- Use Reserved Instances (30-40% savings)
- Enable auto-scaling policies
- Use S3 Intelligent-Tiering for backups
- Set appropriate database backup retention (e.g., 7 days)
- Monitor unused resources

## Support & Resources

- Documentation: See docs/ folder
- API Reference: See API.md
- Architecture: See 00-foundation/03-architecture-overview.md
- Troubleshooting: See 14-runbooks/06-troubleshooting-guide.md
