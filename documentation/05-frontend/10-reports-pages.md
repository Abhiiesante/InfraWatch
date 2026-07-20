# Reports Pages

> **IEKB Section:** 05 — Frontend  
> **Document:** 10-reports-pages.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Asynchronous Polling Pattern](#asynchronous-polling-pattern)
3. [Report List UI](#report-list-ui)
4. [Related Documents](#related-documents)

---

## Overview

The Reports feature allows `ADMIN` and `MANAGER` roles to generate and download PDF exports of compliance metrics and incident summaries. Because the backend generates these asynchronously via a BullMQ worker, the frontend must implement a polling mechanism to provide a smooth UX while waiting for the file.

---

## Asynchronous Polling Pattern

When a user requests a report, the backend returns a `202 Accepted` with a `reportId`. The frontend then polls the backend using that ID until the status changes from `PENDING` to `COMPLETED`, at which point it opens the generated S3 URL in a new tab for download.

### React Query Polling Hook

```typescript
// src/features/reports/api/useReportPolling.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useReportPolling = (reportId: number | null) => {
  return useQuery({
    queryKey: ['report-status', reportId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/reports/${reportId}`);
      return data;
    },
    // Only run this query if we have an ID
    enabled: !!reportId,
    
    // Poll every 3 seconds IF the status is still PENDING
    refetchInterval: (data) => (data?.status === 'PENDING' ? 3000 : false),
    
    // Stop polling in background to save battery/bandwidth
    refetchIntervalInBackground: false, 
  });
};
```

### Generation Component

```tsx
// src/features/reports/components/ReportGenerator.tsx
import { useState, useEffect } from 'react';
import { useCreateReport } from '../api/useCreateReport';
import { useReportPolling } from '../api/useReportPolling';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export const ReportGenerator = () => {
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const createMutation = useCreateReport();
  
  // This hook will automatically start polling once activeReportId is set
  const { data: reportStatus } = useReportPolling(activeReportId);

  // Watch for completion
  useEffect(() => {
    if (reportStatus?.status === 'COMPLETED' && reportStatus.url) {
      // Trigger download
      window.open(reportStatus.url, '_blank');
      // Reset state
      setActiveReportId(null);
    } else if (reportStatus?.status === 'FAILED') {
      alert('Report generation failed: ' + reportStatus.errorMessage);
      setActiveReportId(null);
    }
  }, [reportStatus]);

  const handleGenerate = () => {
    createMutation.mutate(
      { type: 'INCIDENT_SUMMARY', startDate: '2026-01-01', endDate: '2026-12-31' },
      {
        onSuccess: (data) => setActiveReportId(data.reportId)
      }
    );
  };

  const isGenerating = activeReportId !== null;

  return (
    <Button 
      onClick={handleGenerate} 
      disabled={isGenerating || createMutation.isLoading}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        'Generate Summary Report'
      )}
    </Button>
  );
};
```

---

## Report List UI

In addition to generating new reports, users can view previously generated reports in a standard data table.

Since reports are immutable once generated, this table uses basic pagination and simply links to the `url` returned by the API.

```tsx
// src/features/reports/routes/ReportsHistoryPage.tsx
// ... standard TanStack table setup
{
  header: "Actions",
  cell: ({ row }) => {
    const report = row.original;
    if (report.status === 'PENDING') return <Badge>Processing...</Badge>;
    if (report.status === 'FAILED') return <Badge variant="destructive">Failed</Badge>;
    
    return (
      <Button variant="outline" asChild>
        <a href={report.url} target="_blank" rel="noopener noreferrer">
          Download PDF
        </a>
      </Button>
    );
  }
}
```

---

## Related Documents

- **API Contracts:** [Report Endpoints](../04-api/07-report-dashboard-endpoints.md)
- **Backend Service:** [Report Service](../03-backend/10-report-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
