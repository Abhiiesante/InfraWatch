# Report Generation Worker

> **IEKB Section:** 06 — Workers  
> **Document:** 01-report-generation-worker.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Backend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Worker Implementation](#worker-implementation)
3. [PDF Generation Approach](#pdf-generation-approach)
4. [S3 Upload & Status Update](#s3-upload--status-update)
5. [Related Documents](#related-documents)

---

## Overview

Generating a multi-page PDF with charts and tables can take anywhere from 1 to 10 seconds. The Report Generation Worker listens to the `ReportQueue`, fetches the required data from PostgreSQL, renders it into a PDF buffer, uploads it to S3, and updates the database record.

---

## Worker Implementation

The worker function is passed to the BullMQ `Worker` instance on startup.

```typescript
// src/modules/reports/report.worker.ts
import { Job } from 'bullmq';
import { prisma } from '@/config/prisma';
import { aggregateIncidentSummary } from './aggregators/incident-summary';
import { generatePDF } from '@/utils/pdf';
import { uploadToS3 } from '@/utils/s3';

interface ReportJobPayload {
  tenantId: number;
  reportId: number;
  reportType: string;
  startDate: string;
  endDate: string;
}

export async function handleReportJob(job: Job<ReportJobPayload>) {
  const { tenantId, reportId, reportType, startDate, endDate } = job.data;

  try {
    // 1. Mark as In Progress (Optional, if UI wants to distinguish Queued vs Processing)
    // await prisma.report.update({ where: { id: reportId }, data: { status: 'PROCESSING' }});

    let reportData;
    let pdfBuffer: Buffer;

    // 2. Aggregate Data based on Type
    if (reportType === 'INCIDENT_SUMMARY') {
      reportData = await aggregateIncidentSummary(tenantId, new Date(startDate), new Date(endDate));
      pdfBuffer = await generatePDF('incident-summary-template', reportData);
    } else {
      throw new Error(`Unsupported report type: ${reportType}`);
    }

    // 3. Upload to S3
    const objectKey = `reports/${tenantId}/${reportId}/report.pdf`;
    const s3Url = await uploadToS3(objectKey, pdfBuffer, 'application/pdf');

    // 4. Update Database as COMPLETED
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'COMPLETED',
        url: s3Url
      }
    });

  } catch (error) {
    // 5. Handle Failure
    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'FAILED',
        errorMessage: error.message
      }
    });
    
    // Throwing tells BullMQ to potentially retry based on backoff settings
    throw error; 
  }
}
```

---

## PDF Generation Approach

For V0, we use **Puppeteer** (headless Chrome) to generate PDFs from HTML templates. While heavy, it provides the most flexibility for rendering complex CSS grids, Tailwind styles, and charts.

```typescript
// src/utils/pdf.ts
import puppeteer from 'puppeteer';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

export async function generatePDF(templateName: string, data: any): Promise<Buffer> {
  // 1. Load HTML template
  const templatePath = path.join(__dirname, `../templates/${templateName}.html`);
  const templateHtml = await fs.readFile(templatePath, 'utf-8');
  
  // 2. Compile with Handlebars
  const template = Handlebars.compile(templateHtml);
  const htmlContent = template(data);

  // 3. Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for Docker
  });
  
  const page = await browser.newPage();
  
  // 4. Set Content and wait for fonts/images to load
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  // 5. Generate PDF Buffer
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
  });

  await browser.close();
  
  return pdfBuffer;
}
```

> [!WARNING]  
> Puppeteer requires significant RAM. Ensure the Docker container for the Worker is provisioned with at least 1GB of RAM, and keep `concurrency` low (e.g., 2) on the ReportQueue to prevent out-of-memory crashes.

---

## Related Documents

- **Architecture:** [BullMQ Architecture](./00-bullmq-architecture.md)
- **Service:** [Report Service](../03-backend/10-report-service.md)
- **Frontend:** [Reports Pages](../05-frontend/10-reports-pages.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
