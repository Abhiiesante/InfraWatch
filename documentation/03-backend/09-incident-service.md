# Incident Service

> **IEKB Section:** 03 — Backend  
> **Document:** 09-incident-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Status Transition Machine](#status-transition-machine)
3. [Service Implementation](#service-implementation)
4. [Incident Comments](#incident-comments)
5. [Related Documents](#related-documents)

---

## Overview

The `IncidentService` orchestrates the lifecycle of problems reported against physical assets. It ensures strict enforcement of the incident state machine, manages assignments, and triggers asynchronous notifications via BullMQ when incidents are created or reassigned.

---

## Status Transition Machine

Incidents in InfraWatch cannot transition randomly; they must follow a logical flow defined by the business rules.

```typescript
// src/modules/incidents/incident.constants.ts

export type IncidentStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

// Maps a status to an array of valid NEXT statuses
export const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: ['ACKNOWLEDGED', 'IN_PROGRESS', 'CLOSED'], // CLOSED is for false alarms
  ACKNOWLEDGED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'], // IN_PROGRESS means the fix failed/reopened
  CLOSED: ['IN_PROGRESS'], // Reopening a closed incident
};
```

---

## Service Implementation

```typescript
// src/modules/incidents/incident.service.ts
import { prisma } from '@/config/prisma';
import { AppError } from '@/utils/errors';
import { notificationQueue } from '@/queues/notification.queue';
import { VALID_TRANSITIONS } from './incident.constants';
import type { Prisma } from '@prisma/client';

export class IncidentService {

  /**
   * Creates an incident and triggers notifications.
   */
  async create(tenantId: number, reporterId: number, data: any) {
    const incident = await prisma.incident.create({
      data: {
        tenantId,
        reportedById: reporterId,
        assetId: data.assetId,
        title: data.title,
        description: data.description,
        severity: data.severity || 'MEDIUM',
        source: data.source || 'MANUAL',
      },
      include: { asset: { select: { name: true } } }
    });

    // Fire & Forget: Trigger notifications for High/Critical incidents
    if (['HIGH', 'CRITICAL'].includes(incident.severity)) {
      notificationQueue.add('incident-created', {
        tenantId,
        incidentId: incident.id,
        severity: incident.severity,
        assetName: incident.asset?.name || 'Unknown Asset',
      });
    }

    return incident;
  }

  /**
   * Updates an incident status, enforcing the transition map.
   */
  async updateStatus(tenantId: number, incidentId: number, newStatus: string) {
    const incident = await prisma.incident.findFirst({
      where: { id: incidentId, tenantId, deletedAt: null }
    });

    if (!incident) throw new AppError('NOT_FOUND', 'Incident not found', 404);

    // Validate transition
    const validNext = VALID_TRANSITIONS[incident.status as any];
    if (!validNext?.includes(newStatus as any)) {
      throw new AppError('BAD_REQUEST', `Cannot transition incident from ${incident.status} to ${newStatus}`, 400);
    }

    // Prepare update data with timestamps based on status
    const updateData: any = { status: newStatus };
    
    if (newStatus === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    } else if (newStatus === 'CLOSED') {
      updateData.closedAt = new Date();
      // Ensure resolvedAt is populated if skipped
      if (!incident.resolvedAt) updateData.resolvedAt = new Date();
    } else if (newStatus === 'IN_PROGRESS' && incident.status === 'RESOLVED') {
      // If reopening, clear the resolved timestamp
      updateData.resolvedAt = null; 
    }

    return prisma.incident.update({
      where: { id: incidentId },
      data: updateData
    });
  }

  /**
   * Assigns an incident to a user.
   */
  async assign(tenantId: number, incidentId: number, assigneeId: number) {
    // 1. Verify Assignee is an active user in this tenant
    const user = await prisma.user.findFirst({
      where: { id: assigneeId, tenantId, isActive: true }
    });
    if (!user) throw new AppError('NOT_FOUND', 'Assignee not found or inactive', 404);

    // 2. Update Incident
    const incident = await prisma.incident.update({
      where: { id: incidentId, tenantId, deletedAt: null },
      data: { 
        assignedToId: assigneeId,
        // Auto-transition to IN_PROGRESS if it was OPEN/ACKNOWLEDGED
        ...( ['OPEN', 'ACKNOWLEDGED'].includes(incident.status) ? { status: 'IN_PROGRESS' } : {} )
      }
    });

    // 3. Notify Assignee
    notificationQueue.add('incident-assigned', {
      tenantId,
      incidentId,
      assigneeId,
      title: incident.title
    });

    return incident;
  }
}

export const incidentService = new IncidentService();
```

---

## Incident Comments

Adding a comment to an incident is handled by a sub-method in the same service.

```typescript
// Inside src/modules/incidents/incident.service.ts
async addComment(tenantId: number, userId: number, incidentId: number, content: string) {
  // Verify incident exists and isn't deleted
  const incident = await prisma.incident.findFirst({
    where: { id: incidentId, tenantId, deletedAt: null }
  });
  if (!incident) throw new AppError('NOT_FOUND', 'Incident not found', 404);

  return prisma.incidentComment.create({
    data: {
      incidentId,
      userId,
      content
    },
    include: {
      user: { select: { name: true, role: true, avatarUrl: true } }
    }
  });
}
```

---

## Related Documents

- **Database:** [Incident Table](../01-database/09-incident-table.md)
- **API:** [Incident Endpoints](../04-api/06-incident-endpoints.md)
- **Workers:** [Notification Worker](../07-workers/03-notification-worker.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
