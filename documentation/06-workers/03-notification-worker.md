# Notification Worker

> **IEKB Section:** 06 — Workers  
> **Document:** 03-notification-worker.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Worker Implementation](#worker-implementation)
3. [Email Integration (AWS SES)](#email-integration-aws-ses)
4. [Slack Integration](#slack-integration)
5. [Related Documents](#related-documents)

---

## Overview

Sending an email or a Slack webhook requires an external HTTP request, which can take several hundred milliseconds or even timeout. To keep API responses fast (under 100ms), the API enqueues notification tasks to BullMQ, which are picked up by the Notification Worker.

---

## Worker Implementation

The worker delegates the actual routing logic back to the shared `NotificationService`, ensuring that business logic regarding *who* gets notified remains centralized, while the worker just provides the execution context.

```typescript
// src/modules/notifications/notification.worker.ts
import { Job } from 'bullmq';
import { notificationService } from './notification.service';
import { logger } from '@/utils/logger';

interface NotificationPayload {
  tenantId: number;
  event: string;
  payload: any;
}

export async function handleNotificationJob(job: Job<NotificationPayload>) {
  const { tenantId, event, payload } = job.data;

  try {
    // Delegate to the service class
    await notificationService.dispatch(tenantId, event, payload);
    logger.info(`Successfully dispatched notification for event: ${event}`);
  } catch (error) {
    logger.error(`Failed to dispatch notification for event: ${event}`, error);
    // BullMQ will automatically retry based on the queue configuration (e.g. exponential backoff)
    throw error;
  }
}
```

---

## Email Integration (AWS SES)

We use AWS Simple Email Service (SES) to send emails securely and at scale.

```typescript
// src/utils/email.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from '@/config/env';

const sesClient = new SESClient({ region: env.AWS_REGION });

interface EmailOptions {
  to: string[];
  subject: string;
  template: string; // Used to load the HTML template (omitted for brevity)
  context: any;     // Data to inject into the template
}

export async function sendEmail({ to, subject, template, context }: EmailOptions) {
  // 1. Render template (e.g., using Handlebars)
  const htmlBody = renderTemplate(template, context);
  const textBody = renderTextFallback(template, context);

  // 2. Build SES Command
  const command = new SendEmailCommand({
    Source: 'no-reply@infrawatch.com', // Must be verified in AWS SES
    Destination: { ToAddresses: to },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        Text: { Data: textBody, Charset: 'UTF-8' }
      }
    }
  });

  // 3. Send
  await sesClient.send(command);
}
```

---

## Slack Integration

Slack webhooks are simpler, requiring a standard POST request with a specific JSON payload.

```typescript
// src/utils/slack.ts
import axios from 'axios';
import { logger } from './logger';

export async function sendSlackMessage(webhookUrl: string, message: { text: string }) {
  try {
    await axios.post(webhookUrl, message, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // We log but don't throw, as we don't want an invalid Slack URL 
    // configured by a user to cause infinite BullMQ retries.
    logger.error('Failed to send Slack webhook', error);
  }
}
```

---

## Related Documents

- **Architecture:** [BullMQ Architecture](./00-bullmq-architecture.md)
- **Backend Service:** [Notification Service](../03-backend/11-notification-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
