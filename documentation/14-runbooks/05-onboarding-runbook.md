# Employee Onboarding / Offboarding Runbook

> **IEKB Section:** 15 — Runbooks  
> **Document:** 05-onboarding-runbook.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Engineering Manager  
> **Status:** Approved

---

## Table of Contents

1. [Granting Access (Onboarding)](#granting-access-onboarding)
2. [Revoking Access (Offboarding)](#revoking-access-offboarding)
3. [Related Documents](#related-documents)

---

## Granting Access (Onboarding)

When a new engineer joins the team, IT will automatically provision their Google Workspace and Slack accounts. Engineering Management is responsible for developer tools.

1. **GitHub:**
   - Add the user to the `infrawatch` GitHub Organization.
   - Assign them to the `@infrawatch/engineering` team (grants read/write access to repositories).
2. **Jira/Confluence:**
   - Invite their `@infrawatch.com` email to the Atlassian workspace.
   - Add them to the "InfraWatch Engineering" group.
3. **AWS (SSO):**
   - We use AWS IAM Identity Center (SSO). 
   - Add them to the `DeveloperAccess` group in the AWS Console (grants read-only access to Prod, PowerUser access to Staging/Dev).
   - **Do NOT** grant them `AdministratorAccess` unless they are the DevOps Lead.
4. **1Password:**
   - Invite them to the 1Password Engineering Vault.

---

## Revoking Access (Offboarding)

When an engineer leaves, access must be revoked within 1 hour.

1. **Google Workspace:** IT suspends the account. This automatically terminates their AWS SSO session since AWS is federated with Google Workspace.
2. **GitHub:** Remove the user from the `infrawatch` Organization. This prevents them from pushing code or viewing PRs.
3. **1Password:** Remove them from the organization.
4. **Secrets Rotation:** If the engineer had access to raw production secrets (e.g., they manually deployed the database password), you must rotate those secrets in AWS Secrets Manager within 24 hours.

---

## Related Documents

- **Project Management:** [Onboarding Checklist](../13-project-management-management/06-onboarding-checklist.md)
- **Security:** [Secrets Management](../10-security/02-secrets-management.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)

