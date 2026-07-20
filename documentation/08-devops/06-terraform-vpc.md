# Terraform: VPC & Network

> **IEKB Section:** 08 — DevOps  
> **Document:** 06-terraform-vpc.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [VPC Module Configuration](#vpc-module-configuration)
3. [Security Groups](#security-groups)
4. [Related Documents](#related-documents)

---

## Overview

We use Terraform to define our infrastructure as code. For the core network, we use the official AWS VPC Terraform module to ensure best practices without writing hundreds of lines of boilerplate routing tables.

---

## VPC Module Configuration

The VPC spans two Availability Zones, providing Public, Private (App), and Database subnets.

```hcl
# infrastructure/terraform/vpc.tf

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "infrawatch-${var.environment}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24"]

  # NAT Gateways are required for private subnets to reach the internet
  # We use one per AZ for High Availability
  enable_nat_gateway     = true
  single_nat_gateway     = false 
  one_nat_gateway_per_az = true

  # Do not give the database subnets internet access
  create_database_subnet_group           = true
  create_database_subnet_route_table     = true
  create_database_internet_gateway_route = false

  tags = {
    Environment = var.environment
    Project     = "InfraWatch"
  }
}
```

---

## Security Groups

Security Groups act as virtual firewalls at the instance level. We enforce strict least-privilege access.

```hcl
# infrastructure/terraform/security_groups.tf

# ALB Security Group: Open to the internet on 80/443
resource "aws_security_group" "alb_sg" {
  name        = "infrawatch-${var.environment}-alb-sg"
  description = "Allow inbound HTTP/HTTPS from anywhere"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ECS Tasks Security Group: Only accepts traffic from the ALB
resource "aws_security_group" "ecs_tasks_sg" {
  name        = "infrawatch-${var.environment}-ecs-sg"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb_sg.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## Related Documents

- **Architecture:** [AWS Architecture](./05-aws-architecture.md)
- **Database:** [Terraform RDS](./07-terraform-rds.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
