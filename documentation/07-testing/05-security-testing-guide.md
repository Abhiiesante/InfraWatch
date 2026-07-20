# Security Testing Guide

> **IEKB Section:** 07 — Testing  
> **Document:** 05-security-testing-guide.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Security Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Static Application Security Testing (SAST)](#static-application-security-testing-sast)
3. [Software Composition Analysis (SCA)](#software-composition-analysis-sca)
4. [Dynamic Application Security Testing (DAST)](#dynamic-application-security-testing-dast)
5. [Related Documents](#related-documents)

---

## Overview

Security is a primary concern for InfraWatch, as it handles sensitive physical infrastructure metadata. Security testing is automated into our CI/CD pipelines to catch vulnerabilities before they reach production.

---

## Static Application Security Testing (SAST)

SAST analyzes our source code for common security flaws (e.g., hardcoded secrets, SQL injection vectors, cross-site scripting vulnerabilities) without executing the application.

We use **SonarQube** (or SonarCloud) integrated directly into GitHub Actions.

```yaml
# .github/workflows/sast.yml
name: SAST
on: [push, pull_request]

jobs:
  sonarcloud:
    name: SonarCloud Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

**Developer Rule:** Any PR that introduces a Critical or High severity security hotspot will automatically fail the CI check and cannot be merged.

---

## Software Composition Analysis (SCA)

SCA focuses on our third-party dependencies (npm packages). Since Node.js applications rely heavily on `node_modules`, this is a major attack vector.

We use **Dependabot** and `npm audit`.

- Dependabot automatically opens PRs to bump dependencies when a CVE is published.
- Our CI pipeline runs `npm audit --audit-level=high` on every build. If a high or critical vulnerability is found in our dependency tree, the build fails.

---

## Dynamic Application Security Testing (DAST)

DAST involves attacking the running application from the outside to find vulnerabilities (like broken authentication, missing CORS headers, or exposed server information).

For V0, we use **OWASP ZAP (Zed Attack Proxy)** to run baseline scans against our staging environment nightly.

```yaml
# .github/workflows/dast.yml
name: DAST (Nightly)
on:
  schedule:
    - cron: '0 2 * * *' # 2 AM UTC Daily

jobs:
  zap_scan:
    runs-on: ubuntu-latest
    name: Scan the web application
    steps:
      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: 'https://staging.infrawatch.com'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a' # Include active scanning
```

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **CI/CD:** [CI Test Pipeline](./09-ci-test-pipeline.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
