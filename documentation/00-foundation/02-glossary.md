# Glossary

> **IEKB Section:** 00 — Foundation & Overview  
> **Document:** 02-glossary.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Platform Team  
> **Status:** Living Document

---

## Table of Contents

1. [Domain Concepts](#domain-concepts)
2. [Technical Terms](#technical-terms)
3. [Architecture Terms](#architecture-terms)
4. [Security Terms](#security-terms)
5. [DevOps Terms](#devops-terms)
6. [AI/ML Terms (V1.1)](#aiml-terms-v11)
7. [Acronyms](#acronyms)
8. [InfraWatch-Specific Terms](#infrawatch-specific-terms)

---

## Domain Concepts

| Term | Definition | Context |
|------|-----------|---------|
| **Asset** | A physical piece of infrastructure tracked in InfraWatch (e.g., tower, solar panel, machine, pipeline, building). Each asset belongs to a single tenant and has a type, location, and metadata. | Core entity. See [Asset Table](../01-database/06-asset-table.md). |
| **Asset Type** | A configurable classification for assets (e.g., "Cellular Tower", "Solar Panel", "Pump Station"). Tenant-specific. | See [Asset Type Table](../01-database/05-asset-type-table.md). |
| **Camera** | A CCTV, IP camera, or visual sensor device registered in InfraWatch and associated with an asset. Stores connection metadata (RTSP URL, location). No live streaming in V0. | See [Camera Table](../01-database/07-camera-table.md). |
| **Inspection** | A scheduled or ad-hoc survey of an asset by an inspector. Includes notes, photos, and completion status. | See [Inspection Tables](../01-database/08-inspection-tables.md). |
| **Inspection Image** | A photograph attached to an inspection, stored in object storage (S3). Contains metadata about which camera and timestamp. | Child of Inspection entity. |
| **Incident** | A reported problem, damage, safety hazard, or anomaly associated with an asset. Has a lifecycle (open → assigned → resolved → closed). | See [Incident Table](../01-database/09-incident-table.md). |
| **Incident Status** | The workflow state of an incident: `OPEN`, `ACKNOWLEDGED`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`. | Enforced via state machine. See [Incident Service](../03-backend/09-incident-service.md). |
| **Organization** | A tenant in the multi-tenant system — typically a company that subscribes to InfraWatch. All data is scoped to an organization. | See [Organization Table](../01-database/03-organization-table.md). |
| **Tenant** | Synonymous with Organization. The data isolation boundary in InfraWatch. | See [Multi-Tenancy Overview](../11-multi-tenancy/00-tenancy-overview.md). |
| **Inspector** | A user with the `INSPECTOR` role who conducts field inspections and reports incidents. | See [RBAC Model](../02-auth/03-rbac-model.md). |
| **Manager** | A user with the `MANAGER` role who oversees inspections, reviews incidents, and manages assets. | See [RBAC Model](../02-auth/03-rbac-model.md). |
| **Report** | A generated PDF or CSV document summarizing inspections and incidents over a date range for a tenant. | See [Report Service](../03-backend/10-report-service.md). |
| **Field-of-View (FoV)** | The observable area covered by a camera, defined by its position and lens angle. Stored as metadata. | Camera configuration. |
| **Geo-coordinates** | Latitude and longitude values stored for assets to support map views and spatial queries. | Stored as `DECIMAL` in the `assets` table. |
| **Metadata (JSONB)** | Flexible key-value data stored as PostgreSQL JSONB on assets. Allows tenant-specific custom fields without schema changes. | See [Asset Table](../01-database/06-asset-table.md). |

---

## Technical Terms

| Term | Definition | Context |
|------|-----------|---------|
| **REST (Representational State Transfer)** | An architectural style for web APIs using HTTP methods (GET, POST, PUT, DELETE) on resource URIs. InfraWatch follows REST conventions with plural noun endpoints. | See [API Design Principles](../04-api/00-api-design-principles.md). |
| **OpenAPI** | A specification standard (formerly Swagger) for describing REST APIs in YAML/JSON. InfraWatch maintains a complete OpenAPI 3.0 spec. | See [OpenAPI Spec](../04-api/01-openapi-spec.md). |
| **CRUD** | Create, Read, Update, Delete — the four basic operations on a data entity. | Standard pattern for all InfraWatch entities. |
| **ORM (Object-Relational Mapping)** | A technique for mapping database rows to application objects. InfraWatch uses Prisma as its ORM. | See [Backend Overview](../03-backend/00-backend-overview.md). |
| **Prisma** | A next-generation TypeScript ORM providing type-safe database access, migrations, and a visual database browser. | See [Project Setup](../03-backend/01-project-setup.md). |
| **Migration** | A versioned SQL or ORM-based script that modifies the database schema. Applied sequentially and tracked in a migrations table. | See [Migration Strategy](../01-database/01-migration-strategy.md). |
| **Seed Data** | Predefined data inserted into the database for development, testing, or initial production setup. | See [Seed Data](../01-database/11-seed-data.md). |
| **Pre-signed URL** | A time-limited URL generated by S3 that allows direct upload/download without exposing AWS credentials to the client. | See [File Upload Service](../03-backend/12-file-upload-service.md). |
| **JSONB** | PostgreSQL's binary JSON storage type. Supports indexing and querying within JSON documents. Used for flexible metadata on assets. | See [Asset Table](../01-database/06-asset-table.md). |
| **WebSocket** | A protocol for persistent, bidirectional communication between client and server. Not used in V0; planned for V1.1 real-time alerts. | Future feature. |
| **Service Worker** | A JavaScript worker that runs in the browser background, enabling offline caching and push notifications. Planned for PWA in V1.1. | Future feature. |
| **PWA (Progressive Web App)** | A web application that uses service workers and manifests to provide native-app-like experiences (offline, installable). Mobile strategy for V1.1. | See [Frontend Overview](../05-frontend/00-frontend-overview.md). |
| **SSR (Server-Side Rendering)** | Rendering web pages on the server before sending to the client. Not used in InfraWatch V0 (SPA architecture). | N/A for V0. |
| **SPA (Single Page Application)** | A web app that loads a single HTML page and dynamically updates content via JavaScript. InfraWatch frontend is an SPA. | See [Frontend Overview](../05-frontend/00-frontend-overview.md). |
| **Optimistic Update** | A UI pattern where the interface updates immediately upon user action, before the server confirms success. Rolled back if the server request fails. | Used in frontend forms. |
| **Debounce** | A programming pattern that delays function execution until after a specified quiet period. Used for search inputs. | Frontend search implementation. |
| **Throttle** | A programming pattern that limits function execution to at most once per specified time interval. Used for scroll events. | Frontend performance. |

---

## Architecture Terms

| Term | Definition | Context |
|------|-----------|---------|
| **Multi-Tenant** | An architecture where a single application instance serves multiple independent customers (tenants), with strict data isolation between them. | Core InfraWatch design. See [Tenancy Overview](../11-multi-tenancy/00-tenancy-overview.md). |
| **Logical Multi-Tenancy** | Multi-tenancy implemented via shared database with `tenant_id` columns, rather than separate databases per tenant. InfraWatch's approach. | See [Data Isolation](../11-multi-tenancy/01-data-isolation.md). |
| **Row-Level Security (RLS)** | A PostgreSQL feature that automatically filters query results based on policies (e.g., by `tenant_id`). Defense-in-depth for data isolation. | See [Data Isolation](../11-multi-tenancy/01-data-isolation.md). |
| **12-Factor App** | A methodology for building SaaS applications with principles like config via environment, stateless processes, and dev/prod parity. | See [Architecture Overview](./03-architecture-overview.md). |
| **Backing Service** | Any service the app consumes over the network (database, cache, storage, email). Treated as attached resources per 12-Factor. | See [Architecture Overview](./03-architecture-overview.md). |
| **API Gateway** | A server that acts as the single entry point for API requests, handling routing, auth, rate limiting, and SSL termination. InfraWatch uses Nginx or AWS ALB. | See [Architecture Overview](./03-architecture-overview.md). |
| **Middleware** | Code that executes between receiving a request and processing it in a handler. InfraWatch uses middleware for auth, tenant context, validation, and logging. | See [Middleware Pipeline](../03-backend/03-middleware-pipeline.md). |
| **Message Queue** | An asynchronous communication mechanism for distributing work to background workers. InfraWatch uses BullMQ (Redis-backed). | See [Worker Overview](../06-workers/00-worker-overview.md). |
| **Dead-Letter Queue (DLQ)** | A queue that stores messages that could not be processed successfully after a configured number of retries. Used for failed notifications and report jobs. | See [Worker Overview](../06-workers/00-worker-overview.md). |
| **Event-Driven Architecture** | A pattern where components communicate by emitting and reacting to events. V1.1 will use events for AI pipeline triggers. | See [AI Data Pipeline](../12-ai-integration/01-data-pipeline.md). |
| **Horizontal Scaling** | Adding more instances of a service to handle increased load. InfraWatch API and workers support horizontal scaling. | See [Scaling Runbook](../14-runbooks/04-scaling-runbook.md). |
| **Vertical Scaling** | Increasing resources (CPU, RAM) of existing instances. Used for database scaling before read replicas. | See [Scaling Runbook](../14-runbooks/04-scaling-runbook.md). |
| **Blue-Green Deployment** | A deployment strategy using two identical environments, switching traffic from "blue" (current) to "green" (new) atomically. | See [Deployment Runbook](../14-runbooks/01-deployment-runbook.md). |
| **Canary Deployment** | A deployment strategy that routes a small percentage of traffic to a new version before full rollout. | See [Deployment Runbook](../14-runbooks/01-deployment-runbook.md). |
| **Circuit Breaker** | A pattern that prevents cascade failures by stopping requests to a failing service after a threshold. | See [Error Handling](../03-backend/02-error-handling.md). |
| **Health Check** | An endpoint or probe that reports whether a service is healthy and ready to receive traffic. | See [Health Checks](../09-observability/05-health-checks.md). |
| **Idempotency** | The property of an operation producing the same result regardless of how many times it's executed. Critical for retry-safe APIs and workers. | See [API Design Principles](../04-api/00-api-design-principles.md). |

---

## Security Terms

| Term | Definition | Context |
|------|-----------|---------|
| **JWT (JSON Web Token)** | A compact, signed token format used for authentication. Contains encoded claims (user ID, tenant ID, role) verified on each request. | See [JWT Implementation](../02-auth/01-jwt-implementation.md). |
| **Access Token** | A short-lived JWT (~15 minutes) used to authenticate API requests. Sent in the `Authorization: Bearer` header. | See [JWT Implementation](../02-auth/01-jwt-implementation.md). |
| **Refresh Token** | A long-lived token (~7 days) used to obtain new access tokens without re-authentication. Stored in httpOnly cookies. | See [JWT Implementation](../02-auth/01-jwt-implementation.md). |
| **OAuth 2.0** | An authorization framework that enables secure, delegated access to resources. InfraWatch supports OAuth2 for SSO. | See [SSO Integration](../02-auth/05-sso-integration.md). |
| **OIDC (OpenID Connect)** | An identity layer on top of OAuth 2.0 for authentication. Used for SSO with providers like Keycloak, Cognito, Azure AD. | See [SSO Integration](../02-auth/05-sso-integration.md). |
| **RBAC (Role-Based Access Control)** | An access control model where permissions are assigned to roles, and roles are assigned to users. InfraWatch roles: ADMIN, MANAGER, INSPECTOR. | See [RBAC Model](../02-auth/03-rbac-model.md). |
| **bcrypt** | A password hashing algorithm that incorporates a salt and configurable work factor to resist brute-force attacks. | See [Password Security](../02-auth/02-password-security.md). |
| **Salt** | A random value added to a password before hashing to prevent rainbow table attacks. bcrypt generates salts automatically. | See [Password Security](../02-auth/02-password-security.md). |
| **CORS (Cross-Origin Resource Sharing)** | A browser security mechanism that controls which domains can access API resources. Configured on the backend. | See [Backend Overview](../03-backend/00-backend-overview.md). |
| **CSRF (Cross-Site Request Forgery)** | An attack that tricks a user's browser into making unintended requests. Mitigated by SameSite cookies and CSRF tokens. | See [Application Security](../10-security/03-application-security.md). |
| **XSS (Cross-Site Scripting)** | An attack that injects malicious scripts into web pages. Mitigated by output encoding and CSP headers. | See [Application Security](../10-security/03-application-security.md). |
| **SQL Injection** | An attack that inserts malicious SQL into application queries. Mitigated by parameterized queries (Prisma). | See [Application Security](../10-security/03-application-security.md). |
| **TLS (Transport Layer Security)** | A cryptographic protocol that provides encryption for data in transit. All InfraWatch traffic uses HTTPS/TLS 1.3. | See [SSL, DNS & Networking](../08-devops/08-ssl-dns-networking.md). |
| **Encryption at Rest** | Encrypting stored data (database, S3 objects) using managed keys (AWS KMS, Azure Key Vault). | See [Data Encryption](../10-security/01-data-encryption.md). |
| **Principle of Least Privilege** | Granting users and services only the minimum permissions needed. Applied to RBAC, IAM, and database access. | See [Security Overview](../10-security/00-security-overview.md). |
| **Audit Trail** | An immutable log of who did what, when, and to which resource. Required for compliance (SOC 2, GDPR). | See [Audit Logging](../10-security/04-audit-logging.md). |
| **WAF (Web Application Firewall)** | A firewall that filters, monitors, and blocks HTTP traffic based on rules. Protects against common web attacks. | See [Network Security](../10-security/02-network-security.md). |

---

## DevOps Terms

| Term | Definition | Context |
|------|-----------|---------|
| **IaC (Infrastructure as Code)** | Managing infrastructure through version-controlled configuration files rather than manual processes. InfraWatch uses Terraform. | See [Terraform — AWS](../08-devops/03-terraform-aws.md). |
| **Terraform** | An open-source IaC tool by HashiCorp for provisioning cloud resources across AWS, GCP, and Azure using HCL configuration. | See [DevOps Overview](../08-devops/00-devops-overview.md). |
| **Docker** | A containerization platform that packages applications and dependencies into portable containers. | See [Docker Setup](../08-devops/01-docker-setup.md). |
| **Kubernetes (K8s)** | A container orchestration platform for automating deployment, scaling, and management of containerized applications. | See [Kubernetes Manifests](../08-devops/02-kubernetes-manifests.md). |
| **Helm** | A package manager for Kubernetes that manages charts (templated K8s manifests). | See [Kubernetes Manifests](../08-devops/02-kubernetes-manifests.md). |
| **CI/CD (Continuous Integration/Continuous Deployment)** | Automated pipelines that build, test, and deploy code on every commit. InfraWatch uses GitHub Actions. | See [CI/CD Pipeline](../08-devops/06-ci-cd-pipeline.md). |
| **GitOps** | An operational framework where Git is the single source of truth for infrastructure and application state. | See [CI/CD Pipeline](../08-devops/06-ci-cd-pipeline.md). |
| **HPA (Horizontal Pod Autoscaler)** | A Kubernetes resource that automatically scales pods based on CPU/memory utilization or custom metrics. | See [Kubernetes Manifests](../08-devops/02-kubernetes-manifests.md). |
| **ConfigMap** | A Kubernetes object for storing non-sensitive configuration as key-value pairs, injected into pods as environment variables or files. | See [Kubernetes Manifests](../08-devops/02-kubernetes-manifests.md). |
| **Secret** | A Kubernetes object for storing sensitive data (passwords, tokens) in base64-encoded format, injected into pods securely. | See [Environment Management](../08-devops/07-environment-management.md). |
| **Ingress** | A Kubernetes resource that manages external access to services, typically HTTP/HTTPS, with routing rules and TLS termination. | See [Kubernetes Manifests](../08-devops/02-kubernetes-manifests.md). |
| **RTO (Recovery Time Objective)** | The maximum acceptable time to restore service after a failure. InfraWatch target: < 1 hour for non-data-loss scenarios. | See [Backup & DR](../08-devops/09-backup-disaster-recovery.md). |
| **RPO (Recovery Point Objective)** | The maximum acceptable data loss measured in time. InfraWatch target: < 1 hour (continuous WAL archiving). | See [Backup & DR](../08-devops/09-backup-disaster-recovery.md). |
| **ECS (Elastic Container Service)** | AWS's managed container orchestration service. Alternative to EKS (Kubernetes) for running InfraWatch. | See [Terraform — AWS](../08-devops/03-terraform-aws.md). |
| **EKS (Elastic Kubernetes Service)** | AWS's managed Kubernetes service. Primary orchestration choice for InfraWatch. | See [Terraform — AWS](../08-devops/03-terraform-aws.md). |
| **RDS (Relational Database Service)** | AWS's managed database service. Used for PostgreSQL hosting with Multi-AZ for high availability. | See [Terraform — AWS](../08-devops/03-terraform-aws.md). |

---

## AI/ML Terms (V1.1)

| Term | Definition | Context |
|------|-----------|---------|
| **Object Detection** | An AI/CV task that identifies and locates objects within images or video frames using bounding boxes and class labels. | See [Object Detection Service](../12-ai-integration/02-object-detection-service.md). |
| **YOLO (You Only Look Once)** | A family of real-time object detection models. InfraWatch V1.1 plans to use YOLOv8 for smoke, fire, and intrusion detection. | See [Object Detection Service](../12-ai-integration/02-object-detection-service.md). |
| **PPE (Personal Protective Equipment)** | Safety gear such as helmets, vests, goggles, and gloves. V1.1 includes AI-based PPE compliance checking. | See [PPE Compliance Service](../12-ai-integration/03-ppe-compliance-service.md). |
| **Confidence Score** | A numeric value (0.0–1.0) indicating how certain a model is about a detection. Detections below threshold are discarded. | See [AI Data Contracts](../12-ai-integration/07-ai-data-contracts.md). |
| **HITL (Human-in-the-Loop)** | A design pattern where AI-generated results are reviewed and validated by humans before action is taken. | See [HITL Review Queue](../12-ai-integration/05-hitl-review-queue.md). |
| **Inference** | The process of using a trained ML model to make predictions on new data. Runs on GPU-equipped servers or cloud endpoints. | See [Object Detection Service](../12-ai-integration/02-object-detection-service.md). |
| **Anomaly Detection** | Identifying data points that deviate significantly from expected patterns. Used on sensor time-series data. | See [Predictive Analytics](../12-ai-integration/04-predictive-analytics.md). |
| **MLOps** | The set of practices for deploying, monitoring, and managing ML models in production. Includes versioning, A/B testing, and retraining. | See [Model Management](../12-ai-integration/06-model-management.md). |
| **RTSP (Real-Time Streaming Protocol)** | A network protocol for controlling streaming media servers. Used by IP cameras; InfraWatch stores RTSP URLs for V1.1 stream access. | Camera configuration field. |
| **Bounding Box** | A rectangular region in an image that identifies the location of a detected object. Defined by (x, y, width, height). | Object detection output. |
| **False Positive** | An AI detection that incorrectly identifies something as a threat (e.g., steam classified as smoke). Managed via HITL review. | See [HITL Review Queue](../12-ai-integration/05-hitl-review-queue.md). |
| **Model Version** | A specific trained instance of an ML model, identified by a version number and associated training metadata. | See [Model Management](../12-ai-integration/06-model-management.md). |

---

## Acronyms

| Acronym | Expansion |
|---------|-----------|
| **ADR** | Architecture Decision Record |
| **ALB** | Application Load Balancer |
| **APM** | Application Performance Monitoring |
| **CDN** | Content Delivery Network |
| **CMMS** | Computerized Maintenance Management System |
| **CNN** | Convolutional Neural Network |
| **CORS** | Cross-Origin Resource Sharing |
| **CSRF** | Cross-Site Request Forgery |
| **DLQ** | Dead-Letter Queue |
| **DNS** | Domain Name System |
| **DoD** | Definition of Done |
| **DR** | Disaster Recovery |
| **ECS** | Elastic Container Service |
| **EKS** | Elastic Kubernetes Service |
| **ELK** | Elasticsearch, Logstash, Kibana |
| **ER** | Entity-Relationship |
| **FoV** | Field of View |
| **GDPR** | General Data Protection Regulation |
| **GKE** | Google Kubernetes Engine |
| **HA** | High Availability |
| **HCL** | HashiCorp Configuration Language |
| **HITL** | Human-in-the-Loop |
| **HPA** | Horizontal Pod Autoscaler |
| **IAM** | Identity and Access Management |
| **IaC** | Infrastructure as Code |
| **IEKB** | InfraWatch Engineering Knowledge Base |
| **JWT** | JSON Web Token |
| **KMS** | Key Management Service |
| **K8s** | Kubernetes |
| **LSTM** | Long Short-Term Memory (neural network) |
| **MAU** | Monthly Active Users |
| **MLOps** | Machine Learning Operations |
| **MQTT** | Message Queuing Telemetry Transport |
| **MVP** | Minimum Viable Product |
| **NPS** | Net Promoter Score |
| **OIDC** | OpenID Connect |
| **ORM** | Object-Relational Mapping |
| **OWASP** | Open Web Application Security Project |
| **PPE** | Personal Protective Equipment |
| **PR** | Pull Request |
| **PWA** | Progressive Web App |
| **RACI** | Responsible, Accountable, Consulted, Informed |
| **RBAC** | Role-Based Access Control |
| **RDS** | Relational Database Service |
| **RLS** | Row-Level Security |
| **RPO** | Recovery Point Objective |
| **RTO** | Recovery Time Objective |
| **RTSP** | Real-Time Streaming Protocol |
| **S3** | Simple Storage Service (AWS) |
| **SAST** | Static Application Security Testing |
| **DAST** | Dynamic Application Security Testing |
| **SLA** | Service Level Agreement |
| **SLI** | Service Level Indicator |
| **SLO** | Service Level Objective |
| **SPA** | Single Page Application |
| **SQL** | Structured Query Language |
| **SSO** | Single Sign-On |
| **TLS** | Transport Layer Security |
| **VPC** | Virtual Private Cloud |
| **WAF** | Web Application Firewall |
| **WAL** | Write-Ahead Log |
| **XSS** | Cross-Site Scripting |

---

## InfraWatch-Specific Terms

| Term | Definition |
|------|-----------|
| **Tenant Context** | The combination of `tenant_id` and authenticated user information extracted from the JWT and attached to every request via middleware. All database queries are scoped to this context. |
| **Asset Health Score** | (V1.1) A computed metric (0-100) based on inspection history, incident frequency, and sensor data indicating overall asset condition. |
| **Inspection Compliance Rate** | The percentage of scheduled inspections completed on time. A key KPI tracked on the dashboard. |
| **Incident SLA** | The target time to acknowledge and resolve incidents by severity: P1 (1 hour), P2 (4 hours), P3 (24 hours), P4 (1 week). |
| **AI Review Queue** | (V1.1) A UI screen where human reviewers validate or dismiss AI-generated detections before they become confirmed incidents. |
| **Detection Event** | (V1.1) An AI-generated record capturing what was detected, where, when, by which model version, and with what confidence score. |
| **Tenant Seed** | The set of initial data (default asset types, admin user, settings) created when a new organization signs up. |
| **IEKB** | This document collection. The InfraWatch Engineering Knowledge Base — the single source of truth for all engineering decisions, patterns, and procedures. |

---

## Related Documents

- **Previous:** [IEKB Master Index](./00-IEKB-index.md)
- **Next:** [Architecture Overview](./03-architecture-overview.md)
- **Context:** [Product Vision](./01-product-vision.md) — Uses many of these terms

