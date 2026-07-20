# Terraform: RDS PostgreSQL

> **IEKB Section:** 08 — DevOps  
> **Document:** 07-terraform-rds.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [RDS Security Group](#rds-security-group)
3. [RDS Instance Configuration](#rds-instance-configuration)
4. [Related Documents](#related-documents)

---

## Overview

The PostgreSQL database is the core of InfraWatch. We deploy it to the isolated database subnets using AWS RDS. For V0 production, we enable `multi_az` to ensure high availability and automatic failover.

---

## RDS Security Group

The database must only accept connections from the ECS tasks (API and Worker).

```hcl
# infrastructure/terraform/rds.tf

resource "aws_security_group" "rds_sg" {
  name        = "infrawatch-${var.environment}-rds-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    # Only allow traffic from the ECS Security Group
    security_groups = [aws_security_group.ecs_tasks_sg.id] 
  }
}
```

---

## RDS Instance Configuration

```hcl
resource "aws_db_instance" "postgres" {
  identifier           = "infrawatch-${var.environment}-db"
  engine               = "postgres"
  engine_version       = "15.3"
  
  # Instance sizing (scale up as needed)
  instance_class       = var.environment == "production" ? "db.t4g.medium" : "db.t4g.micro"
  allocated_storage    = 50
  max_allocated_storage = 200 # Auto-scale storage up to 200GB
  
  db_name              = "infrawatch"
  username             = "postgres_admin"
  
  # Passwords should NEVER be hardcoded. Pulled from AWS Secrets Manager or TF Vars.
  password             = var.db_password 

  db_subnet_group_name = module.vpc.database_subnet_group
  vpc_security_group_ids = [aws_security_group.rds_sg.id]

  multi_az               = var.environment == "production" ? true : false
  publicly_accessible    = false
  storage_encrypted      = true

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Prevent accidental deletion in production
  deletion_protection = var.environment == "production" ? true : false
  
  # Skip snapshot on destroy for dev environments
  skip_final_snapshot = var.environment != "production"
}
```

---

## Related Documents

- **Architecture:** [AWS Architecture](./05-aws-architecture.md)
- **Terraform:** [Terraform VPC Configuration](./06-terraform-vpc.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
