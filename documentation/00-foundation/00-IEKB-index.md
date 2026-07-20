# InfraWatch Engineering Knowledge Base (IEKB)

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-16  
> **Classification:** Internal Engineering — Confidential  
> **Maintainers:** InfraWatch Platform Team

---

## Document Map

---

## Section: 00-foundation

| # | Document |
|---|----------|
| 1 | [00 IEKB Index](./00-IEKB-index.md) |
| 2 | [01 Product Vision](./01-product-vision.md) |
| 3 | [02 Glossary](./02-glossary.md) |
| 4 | [03 Architecture Overview](./03-architecture-overview.md) |
| 5 | [04 Tech Stack Decisions](./04-tech-stack-decisions.md) |
| 6 | [05 Coding Standards](./05-coding-standards.md) |
| 7 | [06 Repository Structure](./06-repository-structure.md) |
| 8 | [07 Development Workflow](./07-development-workflow.md) |

---

## Section: 01-database

| # | Document |
|---|----------|
| 9 | [00 Data Model Overview](../01-database/00-data-model-overview.md) |
| 10 | [01 Migration Strategy](../01-database/01-migration-strategy.md) |
| 11 | [02 Migration V001 Baseline](../01-database/02-migration-V001-baseline.md) |
| 12 | [03 Organization Table](../01-database/03-organization-table.md) |
| 13 | [04 User Table](../01-database/04-user-table.md) |
| 14 | [05 Asset Type Table](../01-database/05-asset-type-table.md) |
| 15 | [06 Asset Table](../01-database/06-asset-table.md) |
| 16 | [07 Camera Table](../01-database/07-camera-table.md) |
| 17 | [08 Inspection Tables](../01-database/08-inspection-tables.md) |
| 18 | [09 Incident Table](../01-database/09-incident-table.md) |
| 19 | [10 Indexing Performance](../01-database/10-indexing-performance.md) |
| 20 | [11 Seed Data](../01-database/11-seed-data.md) |

---

## Section: 02-auth

| # | Document |
|---|----------|
| 21 | [00 Auth Overview](../02-auth/00-auth-overview.md) |
| 22 | [01 Jwt Implementation](../02-auth/01-jwt-implementation.md) |
| 23 | [02 Password Security](../02-auth/02-password-security.md) |
| 24 | [03 Rbac Model](../02-auth/03-rbac-model.md) |
| 25 | [04 Tenant Context](../02-auth/04-tenant-context.md) |
| 26 | [05 Sso Integration](../02-auth/05-sso-integration.md) |
| 27 | [06 Api Key Management](../02-auth/06-api-key-management.md) |
| 28 | [07 Auth Testing](../02-auth/07-auth-testing.md) |

---

## Section: 03-backend

| # | Document |
|---|----------|
| 29 | [00 Backend Overview](../03-backend/00-backend-overview.md) |
| 30 | [01 Project Setup](../03-backend/01-project-setup.md) |
| 31 | [02 Error Handling](../03-backend/02-error-handling.md) |
| 32 | [03 Middleware Pipeline](../03-backend/03-middleware-pipeline.md) |
| 33 | [04 Org Service](../03-backend/04-org-service.md) |
| 34 | [05 User Service](../03-backend/05-user-service.md) |
| 35 | [06 Asset Service](../03-backend/06-asset-service.md) |
| 36 | [07 Camera Service](../03-backend/07-camera-service.md) |
| 37 | [08 Inspection Service](../03-backend/08-inspection-service.md) |
| 38 | [09 Incident Service](../03-backend/09-incident-service.md) |
| 39 | [10 Report Service](../03-backend/10-report-service.md) |
| 40 | [11 Notification Service](../03-backend/11-notification-service.md) |
| 41 | [12 File Upload Service](../03-backend/12-file-upload-service.md) |
| 42 | [13 Pagination Filtering](../03-backend/13-pagination-filtering.md) |

---

## Section: 04-api

| # | Document |
|---|----------|
| 43 | [00 Api Design Principles](../04-api/00-api-design-principles.md) |
| 44 | [01 Openapi Spec](../04-api/01-openapi-spec.md) |
| 45 | [02 Auth Endpoints](../04-api/02-auth-endpoints.md) |
| 46 | [03 Org User Endpoints](../04-api/03-org-user-endpoints.md) |
| 47 | [04 Asset Camera Endpoints](../04-api/04-asset-camera-endpoints.md) |
| 48 | [05 Inspection Endpoints](../04-api/05-inspection-endpoints.md) |
| 49 | [06 Incident Endpoints](../04-api/06-incident-endpoints.md) |
| 50 | [07 Report Dashboard Endpoints](../04-api/07-report-dashboard-endpoints.md) |

---

## Section: 05-frontend

| # | Document |
|---|----------|
| 51 | [00 Frontend Architecture](../05-frontend/00-frontend-architecture.md) |
| 52 | [01 Project Setup](../05-frontend/01-project-setup.md) |
| 53 | [02 State Management](../05-frontend/02-state-management.md) |
| 54 | [03 Routing Navigation](../05-frontend/03-routing-navigation.md) |
| 55 | [04 Auth Pages](../05-frontend/04-auth-pages.md) |
| 56 | [05 Dashboard Page](../05-frontend/05-dashboard-page.md) |
| 57 | [06 Asset Management Pages](../05-frontend/06-asset-management-pages.md) |
| 58 | [07 Camera Streaming](../05-frontend/07-camera-streaming.md) |
| 59 | [08 Inspection Pages](../05-frontend/08-inspection-pages.md) |
| 60 | [09 Incident Pages](../05-frontend/09-incident-pages.md) |
| 61 | [10 Reports Pages](../05-frontend/10-reports-pages.md) |
| 62 | [11 Org Settings Pages](../05-frontend/11-org-settings-pages.md) |

---

## Section: 06-workers

| # | Document |
|---|----------|
| 63 | [00 Bullmq Architecture](../06-workers/00-bullmq-architecture.md) |
| 64 | [01 Report Generation Worker](../06-workers/01-report-generation-worker.md) |
| 65 | [02 Image Processing Worker](../06-workers/02-image-processing-worker.md) |
| 66 | [03 Notification Worker](../06-workers/03-notification-worker.md) |
| 67 | [04 Scheduled Jobs](../06-workers/04-scheduled-jobs.md) |

---

## Section: 07-testing

| # | Document |
|---|----------|
| 68 | [00 Testing Strategy](../07-testing/00-testing-strategy.md) |
| 69 | [01 Unit Testing Backend](../07-testing/01-unit-testing-backend.md) |
| 70 | [02 Integration Testing Backend](../07-testing/02-integration-testing-backend.md) |
| 71 | [03 E2e Testing Guide](../07-testing/03-e2e-testing-guide.md) |
| 72 | [04 Load Testing Guide](../07-testing/04-load-testing-guide.md) |
| 73 | [05 Security Testing Guide](../07-testing/05-security-testing-guide.md) |
| 74 | [06 Unit Testing Frontend](../07-testing/06-unit-testing-frontend.md) |
| 75 | [07 Testing React Query](../07-testing/07-testing-react-query.md) |
| 76 | [08 Test Data Factories](../07-testing/08-test-data-factories.md) |
| 77 | [09 Ci Test Pipeline](../07-testing/09-ci-test-pipeline.md) |

---

## Section: 08-devops

| # | Document |
|---|----------|
| 78 | [00 Devops Overview](../08-devops/00-devops-overview.md) |
| 79 | [01 Dockerfile Backend](../08-devops/01-dockerfile-backend.md) |
| 80 | [02 Dockerfile Frontend](../08-devops/02-dockerfile-frontend.md) |
| 81 | [03 Dockerfile Worker](../08-devops/03-dockerfile-worker.md) |
| 82 | [04 Docker Compose Local](../08-devops/04-docker-compose-local.md) |
| 83 | [05 Aws Architecture](../08-devops/05-aws-architecture.md) |
| 84 | [06 Terraform Vpc](../08-devops/06-terraform-vpc.md) |
| 85 | [07 Terraform Rds](../08-devops/07-terraform-rds.md) |
| 86 | [08 Terraform Elasticache](../08-devops/08-terraform-elasticache.md) |
| 87 | [09 Terraform Ecs](../08-devops/09-terraform-ecs.md) |
| 88 | [10 Github Actions Deploy](../08-devops/10-github-actions-deploy.md) |
| 89 | [11 Database Migrations Ci](../08-devops/11-database-migrations-ci.md) |

---

## Section: 09-observability

| # | Document |
|---|----------|
| 90 | [00 Observability Overview](../09-observability/00-observability-overview.md) |
| 91 | [01 Structured Logging](../09-observability/01-structured-logging.md) |
| 92 | [02 Metrics Prometheus](../09-observability/02-metrics-prometheus.md) |
| 93 | [03 Tracing Guide](../09-observability/03-tracing-guide.md) |
| 94 | [04 Alerting Rules](../09-observability/04-alerting-rules.md) |
| 95 | [05 Health Checks](../09-observability/05-health-checks.md) |

---

## Section: 10-security

| # | Document |
|---|----------|
| 96 | [00 Security Overview](../10-security/00-security-overview.md) |
| 97 | [01 Iam Roles](../10-security/01-iam-roles.md) |
| 98 | [02 Secrets Management](../10-security/02-secrets-management.md) |
| 99 | [03 Cors Csp Headers](../10-security/03-cors-csp-headers.md) |
| 100 | [04 Rate Limiting](../10-security/04-rate-limiting.md) |
| 101 | [05 Data Encryption](../10-security/05-data-encryption.md) |
| 102 | [06 Audit Logging](../10-security/06-audit-logging.md) |
| 103 | [07 Vulnerability Management](../10-security/07-vulnerability-management.md) |

---

## Section: 11-multi-tenancy

| # | Document |
|---|----------|
| 104 | [00 Tenancy Overview](../11-multi-tenancy/00-tenancy-overview.md) |
| 105 | [01 Prisma Rls Extensions](../11-multi-tenancy/01-prisma-rls-extensions.md) |
| 106 | [02 Tenant Isolation Strategies](../11-multi-tenancy/02-tenant-isolation-strategies.md) |
| 107 | [03 Cross Tenant Data Sharing](../11-multi-tenancy/03-cross-tenant-data-sharing.md) |
| 108 | [04 Tenant Onboarding Offboarding](../11-multi-tenancy/04-tenant-onboarding-offboarding.md) |

---

## Section: 12-ai-integration

| # | Document |
|---|----------|
| 109 | [00 Ai Roadmap](../12-ai-integration/00-ai-roadmap.md) |
| 110 | [01 Ml Pipeline Architecture](../12-ai-integration/01-ml-pipeline-architecture.md) |
| 111 | [02 Anomaly Detection](../12-ai-integration/02-anomaly-detection.md) |
| 112 | [03 Predictive Maintenance](../12-ai-integration/03-predictive-maintenance.md) |
| 113 | [04 Automated Reporting](../12-ai-integration/04-automated-reporting.md) |
| 114 | [05 Computer Vision Cameras](../12-ai-integration/05-computer-vision-cameras.md) |
| 115 | [06 Nlp Incident Triage](../12-ai-integration/06-nlp-incident-triage.md) |
| 116 | [07 Data Privacy Ai](../12-ai-integration/07-data-privacy-ai.md) |

---

## Section: 13-project-management

| # | Document |
|---|----------|
| 117 | [00 Project Charter](../13-project-management/00-project-charter.md) |
| 118 | [01 Git Workflow](../13-project-management/01-git-workflow.md) |
| 119 | [02 Pr Guidelines](../13-project-management/02-pr-guidelines.md) |
| 120 | [03 Jira Ticket Lifecycle](../13-project-management/03-jira-ticket-lifecycle.md) |
| 121 | [04 Release Management](../13-project-management/04-release-management.md) |
| 122 | [05 Incident Response](../13-project-management/05-incident-response.md) |
| 123 | [06 Onboarding Checklist](../13-project-management/06-onboarding-checklist.md) |
| 124 | [07 Architecture Decision Records](../13-project-management/07-architecture-decision-records.md) |

---

## Section: 14-runbooks

| # | Document |
|---|----------|
| 125 | [00 Runbook Index](../14-runbooks/00-runbook-index.md) |
| 126 | [01 Deployment Runbook](../14-runbooks/01-deployment-runbook.md) |
| 127 | [02 Database Runbook](../14-runbooks/02-database-runbook.md) |
| 128 | [03 Incident Response Runbook](../14-runbooks/03-incident-response-runbook.md) |
| 129 | [04 Scaling Runbook](../14-runbooks/04-scaling-runbook.md) |
| 130 | [05 Onboarding Runbook](../14-runbooks/05-onboarding-runbook.md) |
| 131 | [06 Troubleshooting Guide](../14-runbooks/06-troubleshooting-guide.md) |
| 132 | [07 Rollback Procedures](../14-runbooks/07-rollback-procedures.md) |

