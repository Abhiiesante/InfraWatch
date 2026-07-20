# Asset Management Pages

> **IEKB Section:** 05 — Frontend  
> **Document:** 06-asset-management-pages.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Assets List Page (Data Table)](#assets-list-page-data-table)
3. [Asset Details Page (Tabs Pattern)](#asset-details-page-tabs-pattern)
4. [Related Documents](#related-documents)

---

## Overview

The Asset Management feature is the core directory of InfraWatch. It consists of a Paginated Data Table for listing assets and a detailed Tabbed View for inspecting a single asset.

---

## Assets List Page (Data Table)

The `AssetsListPage` utilizes `@tanstack/react-table` combined with `shadcn/ui` table primitives.

### URL-Driven State
Filtering, searching, and pagination must be driven by the URL so users can share links to specific views.

```tsx
// src/features/assets/routes/AssetsListPage.tsx
import { useSearchParams } from 'react-router-dom';
import { useAssets } from '../api/useAssets';
import { AssetTable } from '../components/AssetTable';
import { AssetFilters } from '../components/AssetFilters';

export const AssetsListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Extract state from URL
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || undefined;

  // Fetch data
  const { data, isLoading } = useAssets({ page, limit: 20, search, status });

  // Update URL handlers
  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => {
      prev.set('page', String(newPage));
      return prev;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Assets</h1>
        <Button>Add Asset</Button>
      </div>
      
      {/* Search and filter inputs that update the URL */}
      <AssetFilters currentSearch={search} currentStatus={status} onFilterChange={setSearchParams} />
      
      {/* TanStack Table rendering the data */}
      <AssetTable data={data?.items} isLoading={isLoading} onPageChange={handlePageChange} />
    </div>
  );
};
```

---

## Asset Details Page (Tabs Pattern)

An asset has many relations (Cameras, Inspections, Incidents). Loading all of this onto a single page vertically requires too much scrolling and API data fetching. We use a **Tabs Pattern** to organize the data and lazy-load tab content only when active.

```tsx
// src/features/assets/routes/AssetDetailsPage.tsx
import { useParams, Link, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssetDetails } from '../api/useAssetDetails';

export const AssetDetailsPage = () => {
  const { id } = useParams();
  const { data: asset, isLoading } = useAssetDetails(Number(id));
  
  // Use location hash or query param to remember active tab
  const location = useLocation();
  const activeTab = new URLSearchParams(location.search).get('tab') || 'overview';

  if (isLoading) return <SkeletonPage />;
  if (!asset) return <NotFound />;

  return (
    <div className="space-y-6">
      <AssetPageHeader asset={asset} />
      
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link to="?tab=overview">Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="cameras" asChild>
            <Link to="?tab=cameras">Cameras ({asset._count.cameras})</Link>
          </TabsTrigger>
          <TabsTrigger value="incidents" asChild>
            <Link to="?tab=incidents">Incidents</Link>
          </TabsTrigger>
        </TabsList>
        
        {/* Tab contents are separate components that fetch their own paginated data */}
        <TabsContent value="overview">
          <AssetOverviewTab asset={asset} />
        </TabsContent>
        
        <TabsContent value="cameras">
          {/* Only mounts and fetches when tab is active */}
          <AssetCamerasTab assetId={asset.id} /> 
        </TabsContent>
        
        <TabsContent value="incidents">
          <AssetIncidentsTab assetId={asset.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

---

## Related Documents

- **API Contracts:** [Asset & Camera Endpoints](../04-api/04-asset-camera-endpoints.md)
- **State:** [State Management](./02-state-management.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
