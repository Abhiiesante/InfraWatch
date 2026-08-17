import { Router, Request, Response } from 'express';
import { authMiddleware } from '@/middleware/auth.js';
import { ContextGathererService } from '@/services/context-gatherer.service.js';
import { LLMService } from '@/services/llm.service.js';
import logger from '@/utils/logger.js';

const router = Router();

// Define system instructions for the Copilot
const COPILOT_SYSTEM_PROMPT = `
You are the InfraWatch Incident Copilot, an AI assistant for infrastructure operators.
Your job is to analyze the provided incident context and provide:
1. A brief summary of the situation.
2. A list of possible root causes.
3. Recommended next steps for resolution.

Format your response in clean Markdown. Be concise, technical, and actionable.
Do not invent information outside of the provided context.
`;

/**
 * @route POST /api/copilot/incident/:id/analyze
 * @desc Streams LLM analysis of a specific incident via Server-Sent Events (SSE).
 */
router.post('/incident/:id/analyze', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const incidentId = parseInt(req.params.id, 10);

    if (isNaN(incidentId)) {
      res.status(400).json({ error: 'Invalid incident ID' });
      return;
    }

    // 1. Gather Context
    let incidentContext = "";
    try {
      incidentContext = await ContextGathererService.gatherIncidentContext(tenantId, incidentId);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Incident not found' });
      return;
    }

    // 2. Set up SSE HTTP headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush headers to establish SSE connection immediately

    const prompt = `Please analyze the following incident and provide recommendations.\n\n${incidentContext}`;

    // 3. Stream the LLM response
    // First, send metadata about simulation status
    const isSimulated = LLMService.isSimulated();
    res.write(`event: metadata\ndata: ${JSON.stringify({ simulated: isSimulated, reason: isSimulated ? 'GEMINI_API_KEY not configured' : undefined })}\n\n`);

    const onChunk = (chunk: string) => {
      // Server-Sent Events require data lines to begin with 'data: ' and end with '\n\n'
      // We encode the chunk as JSON to preserve newlines and special characters during transmission
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      
      // Attempt to flush if the environment supports it (express compression sometimes buffers)
      if ((res as any).flush) {
        (res as any).flush();
      }
    };

    await LLMService.streamCompletion(prompt, onChunk, {
      systemInstruction: COPILOT_SYSTEM_PROMPT,
      temperature: 0.2, // low temperature for analytical reasoning
      maxTokens: 1024,
    });

    // 4. Close the stream
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err: any) {
    logger.error('Error in Copilot analyze route:', err);
    // If headers are not sent, we can send a 500 JSON. Otherwise, send an SSE error event.
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate copilot analysis' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

/**
 * @route POST /api/copilot/inspection/:id/analyze
 * @desc Streams LLM analysis of a specific inspection via Server-Sent Events (SSE).
 */
router.post('/inspection/:id/analyze', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId!;
    const inspectionId = parseInt(req.params.id, 10);

    if (isNaN(inspectionId)) {
      res.status(400).json({ error: 'Invalid inspection ID' });
      return;
    }

    // 1. Gather Context
    let inspectionContext = "";
    try {
      inspectionContext = await ContextGathererService.gatherInspectionContext(tenantId, inspectionId);
    } catch (e: any) {
      res.status(404).json({ error: e.message || 'Inspection not found' });
      return;
    }

    // 2. Set up SSE HTTP headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const prompt = `Please summarize the following infrastructure inspection. Extract any anomalies, evaluate the asset health, and recommend whether maintenance is required.\n\n${inspectionContext}`;

    // 3. Stream the LLM response
    const isSimulated = LLMService.isSimulated();
    res.write(`event: metadata\ndata: ${JSON.stringify({ simulated: isSimulated, reason: isSimulated ? 'GEMINI_API_KEY not configured' : undefined })}\n\n`);

    const onChunk = (chunk: string) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      if ((res as any).flush) {
        (res as any).flush();
      }
    };

    await LLMService.streamCompletion(prompt, onChunk, {
      systemInstruction: COPILOT_SYSTEM_PROMPT,
      temperature: 0.2,
      maxTokens: 1024,
    });

    // 4. Close the stream
    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err: any) {
    logger.error('Error in Copilot analyze route:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate copilot analysis' });
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

export default router;
