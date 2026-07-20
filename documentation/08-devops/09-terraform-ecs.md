# Terraform: ECS Fargate

> **IEKB Section:** 08 — DevOps  
> **Document:** 09-terraform-ecs.md  
> **Last Updated:** 2026-07-16  
> **Owner:** DevOps Engineer  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [ECS Cluster](#ecs-cluster)
3. [Task Definitions](#task-definitions)
4. [ECS Services](#ecs-services)
5. [Related Documents](#related-documents)

---

## Overview

The compute layer of InfraWatch runs on **AWS ECS Fargate**. We define an ECS Cluster, Task Definitions (the blueprint for a container, like Docker Run args), and ECS Services (the managers that keep X number of tasks running behind a load balancer).

---

## ECS Cluster

The cluster is simply a logical grouping of services. Because we use Fargate, there are no underlying EC2 instances to provision or manage here.

```hcl
# infrastructure/terraform/ecs.tf

resource "aws_ecs_cluster" "main" {
  name = "infrawatch-${var.environment}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}
```

---

## Task Definitions

A Task Definition tells ECS which Docker image to run, how much CPU/RAM to give it, and what environment variables to inject.

```hcl
resource "aws_ecs_task_definition" "api" {
  family                   = "infrawatch-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512 # 0.5 vCPU
  memory                   = 1024 # 1 GB RAM
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name      = "api"
      # The image tag will be updated by GitHub Actions during deployment
      image     = "${aws_ecr_repository.api.repository_url}:latest" 
      essential = true
      
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" }
      ]

      # Pull sensitive data from Secrets Manager at runtime
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_secretsmanager_secret.db_url.arn
        },
        {
          name      = "REDIS_URL"
          valueFrom = aws_secretsmanager_secret.redis_url.arn
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/infrawatch-${var.environment}-api"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}
```

---

## ECS Services

The ECS Service maintains the desired count of tasks. The API service is attached to the Application Load Balancer.

```hcl
resource "aws_ecs_service" "api" {
  name            = "infrawatch-${var.environment}-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.environment == "production" ? 2 : 1
  launch_type     = "FARGATE"

  network_configuration {
    # Place tasks in the private App subnets
    subnets          = module.vpc.private_subnets
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  # Allow Terraform to update the service without destroying it if GitHub Actions
  # updated the task definition outside of Terraform's knowledge.
  lifecycle {
    ignore_changes = [task_definition, desired_count]
  }
}
```

---

## Related Documents

- **Architecture:** [AWS Architecture](./05-aws-architecture.md)
- **Deployment:** [GitHub Actions Deploy](./10-github-actions-deploy.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
