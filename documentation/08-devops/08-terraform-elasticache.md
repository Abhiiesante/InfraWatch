# Terraform: ElastiCache Redis

> **IEKB Section:** 08 — DevOps  
> **Document:** 08-terraform-elasticache.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Redis Security Group](#redis-security-group)
3. [ElastiCache Replication Group](#elasticache-replication-group)
4. [Related Documents](#related-documents)

---

## Overview

Redis is utilized by BullMQ for background job orchestration and by the API for rate limiting. We deploy it to the isolated database subnets using AWS ElastiCache. For V0 production, we use a small Multi-AZ cluster to ensure jobs are not lost during node failure.

---

## Redis Security Group

Like RDS, ElastiCache must only accept connections from the ECS tasks.

```hcl
# infrastructure/terraform/elasticache.tf

resource "aws_security_group" "redis_sg" {
  name        = "infrawatch-${var.environment}-redis-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks_sg.id]
  }
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "infrawatch-${var.environment}-redis-subnet-group"
  # Share the database subnets with RDS
  subnet_ids = module.vpc.database_subnets
}
```

---

## ElastiCache Replication Group

```hcl
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = "infrawatch-${var.environment}-redis"
  description                   = "InfraWatch Redis Cluster"
  node_type                     = var.environment == "production" ? "cache.t4g.micro" : "cache.t4g.micro"
  port                          = 6379
  
  # Set up a primary node with 1 replica for failover
  num_cache_clusters            = var.environment == "production" ? 2 : 1
  automatic_failover_enabled    = var.environment == "production" ? true : false
  multi_az_enabled              = var.environment == "production" ? true : false

  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis_sg.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  # Ensure BullMQ operations like BRPOPLPUSH don't timeout
  parameter_group_name       = "default.redis7"
}
```

---

## Related Documents

- **Architecture:** [BullMQ Architecture](../06-workers/00-bullmq-architecture.md)
- **Terraform:** [Terraform VPC Configuration](./06-terraform-vpc.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
