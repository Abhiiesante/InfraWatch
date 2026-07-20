# Load Testing Guide

> **IEKB Section:** 07 — Testing  
> **Document:** 04-load-testing-guide.md  
> **Last Updated:** 2026-07-16  
> **Owner:** QA Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [k6 Configuration](#k6-configuration)
3. [Example: Testing the Dashboard API](#example-testing-the-dashboard-api)
4. [CI/CD Integration](#cicd-integration)
5. [Related Documents](#related-documents)

---

## Overview

We use **k6** (by Grafana Labs) to ensure our backend APIs can handle concurrent user load without degrading performance. Load testing is critical for endpoints that perform complex database aggregations (like the Dashboard metrics) or handle file uploads.

Our baseline performance goal for V0 is:
- **P95 Latency:** < 200ms for standard CRUD operations.
- **Error Rate:** < 0.1% under a load of 100 Virtual Users (VUs).

---

## k6 Configuration

k6 scripts are written in JavaScript but executed by a high-performance Go engine.

```javascript
// tests/load/config.js
export const options = {
  // Define stages of the load test
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 20 },   // Stay at 20 users for 1 minute
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Hold spike
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    // Assertions that will fail the test if not met
    http_req_duration: ['p(95)<200'], // 95% of requests must complete below 200ms
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
  },
};
```

---

## Example: Testing the Dashboard API

The dashboard endpoint is the most frequently hit API and requires querying multiple tables.

```javascript
// tests/load/dashboard.test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { options } from './config.js';

export { options };

// Setup is run once before the test starts to provision test data
export function setup() {
  const loginRes = http.post('http://localhost:3000/api/v1/auth/login', {
    email: 'admin@loadtest.com',
    password: 'Password123!'
  });
  return { token: loginRes.json('accessToken') };
}

// The default function is executed continuously by Virtual Users
export default function (data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };

  const res = http.get('http://localhost:3000/api/v1/dashboard/metrics', params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has totalAssets field': (r) => r.json('totalAssets') !== undefined,
  });

  // Simulate user think time between requests (1-2 seconds)
  sleep(Math.random() * 1 + 1); 
}
```

---

## CI/CD Integration

Load tests should NOT run on every commit, as they are noisy and require significant infrastructure resources. 

They are configured to run automatically in GitHub Actions on:
1. Pushes to the `main` branch.
2. Nightly builds against the `staging` environment.
3. Manually triggered workflow dispatches before major releases.

---

## Related Documents

- **Strategy:** [Testing Strategy](./00-testing-strategy.md)
- **CI/CD:** [CI Test Pipeline](./09-ci-test-pipeline.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
