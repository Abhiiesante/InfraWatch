# Dashboard Page

> **IEKB Section:** 05 — Frontend  
> **Document:** 05-dashboard-page.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Component Layout](#component-layout)
3. [Data Fetching & Caching](#data-fetching--caching)
4. [Widget Implementations](#widget-implementations)
5. [Related Documents](#related-documents)

---

## Overview

The Dashboard is the primary landing page after authentication. It provides a high-level overview of the tenant's physical infrastructure, prioritizing critical issues (Open Incidents) and immediate tasks (Upcoming Inspections).

The design must feel premium, using Shadcn Cards, subtle gradients, and data visualization components.

---

## Component Layout

The Dashboard is composed of several independent widget components. Rather than having a single massive component fetch all data, each widget manages its own React Query hook. This prevents a slow API call (e.g., aggregating compliance data) from blocking the rendering of simple metrics (e.g., total cameras).

```tsx
// src/features/dashboard/routes/DashboardPage.tsx
import { MetricCardsRow } from '../components/MetricCardsRow';
import { IncidentPriorityChart } from '../components/IncidentPriorityChart';
import { UpcomingInspectionsWidget } from '../components/UpcomingInspectionsWidget';
import { AssetHealthMap } from '../components/AssetHealthMap';

export const DashboardPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-muted-foreground">
          Real-time status of your infrastructure.
        </p>
      </div>
      
      {/* Top Row: Quick KPIs */}
      <MetricCardsRow />
      
      {/* Middle Row: Charts and Maps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6">
        <div className="lg:col-span-4">
          <AssetHealthMap />
        </div>
        <div className="lg:col-span-3">
          <IncidentPriorityChart />
        </div>
      </div>
      
      {/* Bottom Row: Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UpcomingInspectionsWidget />
        {/* Other widgets... */}
      </div>
    </div>
  );
};
```

---

## Data Fetching & Caching

The `MetricCardsRow` fetches data from `/api/v1/dashboard/metrics`. Since this endpoint is cached on the backend, it returns quickly. We set the `staleTime` in React Query to 5 minutes so navigating away from the dashboard and back doesn't trigger unnecessary re-fetches.

```typescript
// src/features/dashboard/api/useDashboardMetrics.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const { data } = await api.get('/v1/dashboard/metrics');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

---

## Widget Implementations

### Metric Cards (Shadcn UI)

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, Camera, CheckCircle } from 'lucide-react';
import { useDashboardMetrics } from '../api/useDashboardMetrics';
import { Skeleton } from '@/components/ui/skeleton';

export const MetricCardsRow = () => {
  const { data, isLoading } = useDashboardMetrics();

  if (isLoading) {
    return <div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" />...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Incidents</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.openIncidents.CRITICAL || 0}</div>
          <p className="text-xs text-muted-foreground">Require immediate attention</p>
        </CardContent>
      </Card>
      
      {/* ... other cards (Cameras, Compliance, Assets) ... */}
    </div>
  );
};
```

### Charts (Recharts)

InfraWatch V0 uses `recharts` for simple data visualizations. The `IncidentPriorityChart` is a donut chart showing the breakdown of open incidents by severity.

---

## Related Documents

- **API:** [Dashboard Endpoints](../04-api/07-report-dashboard-endpoints.md)
- **Architecture:** [Frontend Architecture](./00-frontend-architecture.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
