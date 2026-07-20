# Notification Service

> **IEKB Section:** 03 — Backend  
> **Document:** 11-notification-service.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Event-Driven Architecture](#event-driven-architecture)
3. [Service Implementation](#service-implementation)
4. [Tenant Preferences](#tenant-preferences)
5. [Related Documents](#related-documents)

---

## Overview

The `NotificationService` handles routing alerts to the correct channels (Email, Slack, SMS) when significant events occur in the system, such as a CRITICAL incident being reported or an inspection being assigned.

---

## Event-Driven Architecture

Notifications are decoupled from the main request thread to ensure the API remains fast.

1. **Trigger:** An entity service (e.g., `IncidentService`) completes an action.
2. **Queue:** It places an event message on the `notificationQueue` (BullMQ/Redis).
3. **Process:** The Notification Worker picks up the job.
4. **Route:** The worker calls `NotificationService.dispatch()`.
5. **Deliver:** The service checks tenant settings and sends via AWS SES (Email) or Webhooks (Slack).

---

## Service Implementation

```typescript
// src/modules/notifications/notification.service.ts
import { prisma } from '@/config/prisma';
import { sendEmail } from '@/utils/email'; // Wrapper around AWS SES
import { sendSlackMessage } from '@/utils/slack';

export class NotificationService {

  /**
   * Main entry point for the background worker.
   */
  async dispatch(tenantId: number, event: string, payload: any) {
    // 1. Fetch Tenant Notification Settings
    const settings = await prisma.tenantSetting.findUnique({
      where: { tenantId }
    });

    if (!settings?.notificationConfig) return; // Opted out of all notifications

    const config = settings.notificationConfig as any;

    // 2. Route based on event type
    switch (event) {
      case 'incident-created':
        await this.handleNewIncident(tenantId, config, payload);
        break;
      case 'incident-assigned':
        await this.handleAssignment(tenantId, config, payload);
        break;
      default:
        console.warn(`Unknown notification event: ${event}`);
    }
  }

  private async handleNewIncident(tenantId: number, config: any, payload: any) {
    // High/Critical incidents go to all Admins & Managers
    const recipients = await prisma.user.findMany({
      where: { tenantId, role: { in: ['ADMIN', 'MANAGER'] }, isActive: true },
      select: { email: true, name: true }
    });

    const emails = recipients.map(r => r.email);

    // Dispatch Email (if enabled)
    if (config.email && emails.length > 0) {
      await sendEmail({
        to: emails,
        subject: `[${payload.severity}] New Incident on ${payload.assetName}`,
        template: 'new-incident',
        context: payload
      });
    }

    // Dispatch Slack (if enabled)
    if (config.slack && config.slack_webhook_url) {
      await sendSlackMessage(config.slack_webhook_url, {
        text: `🚨 *${payload.severity} Incident Reported*\nAsset: ${payload.assetName}\nID: ${payload.incidentId}`
      });
    }
  }

  private async handleAssignment(tenantId: number, config: any, payload: any) {
    // Assignments only notify the specific assignee
    const assignee = await prisma.user.findUnique({
      where: { id: payload.assigneeId },
      select: { email: true }
    });

    if (assignee && config.email) {
      await sendEmail({
        to: [assignee.email],
        subject: 'You have been assigned to an incident',
        template: 'incident-assigned',
        context: payload
      });
    }
  }
}

export const notificationService = new NotificationService();
```

---

## Tenant Preferences

Tenants can configure how they want to receive notifications. This data is stored as JSONB in `tenant_settings.notification_config`.

```json
{
  "email": true,
  "slack": true,
  "slack_webhook_url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
  "sms": false,
  "daily_digest": true
}
```

> [!NOTE]
> SMS (via Twilio/AWS SNS) is planned for V1.1 and is not implemented in V0.

---

## Related Documents

- **Database:** [Incident Table](../01-database/09-incident-table.md)
- **Workers:** [Notification Worker](../07-workers/03-notification-worker.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
