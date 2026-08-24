import logger from '@/utils/logger.js';

/**
 * Options for LLM generation.
 */
export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
}

/**
 * Unified interface for LLM Providers.
 */
interface LLMProvider {
  generateCompletion(prompt: string, options?: GenerateOptions): Promise<string>;
  streamCompletion(prompt: string, onChunk: (chunk: string) => void, options?: GenerateOptions): Promise<void>;
}

/**
 * Mock Provider for zero-cost, offline development.
 */
class MockProvider implements LLMProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async generateCompletion(prompt: string, _options?: GenerateOptions): Promise<string> {
    logger.debug('[LLM:Mock] Generating mock completion...');
    
    let severity = "HIGH";
    const lowerPrompt = prompt.toLowerCase();
    if (lowerPrompt.includes("fire") || lowerPrompt.includes("explosion") || lowerPrompt.includes("critical") || lowerPrompt.includes("smoke") || lowerPrompt.includes("hazard")) {
      severity = "CRITICAL";
    }

    // Return a JSON string that matches the expected TriageResult structure
    return JSON.stringify({
      suggestedSeverity: severity,
      suggestedCategory: "Safety & Security Hazards",
      estimatedResolutionHours: severity === "CRITICAL" ? 2.0 : 4.5,
      slaBreachRiskPct: severity === "CRITICAL" ? 45.0 : 20.0,
      actionPlan: ["1. Dispatch inspector immediately", "2. Secure the area"],
      rationale: "Mocked LLM analysis detected risk keywords."
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async streamCompletion(prompt: string, onChunk: (chunk: string) => void, _options?: GenerateOptions): Promise<void> {
    logger.debug('[LLM:Mock] Streaming mock completion...');
    
    const isInspection = prompt.toLowerCase().includes("inspection");
    
    let words: string[] = [];
    if (isInspection) {
      words = [
        "Based", " on", " the", " provided", " inspection", " context,", " the", " asset", " shows",
        " minor", " signs", " of", " wear", " but", " remains", " structurally", " sound.", "\n\n",
        "**Summary & Recommendations:**\n",
        "- No critical anomalies detected in the captured images.\n",
        "- The inspector noted standard operational conditions.\n",
        "- Recommendation: Continue regular maintenance schedule; no immediate action required."
      ];
    } else {
      words = [
        "Based", " on", " the", " provided", " context,", " this", " incident", " appears", " to",
        " be", " related", " to", " a", " potential", " sensor", " malfunction.", "\n\n",
        "**Recommended Actions:**\n",
        "- Dispatch an inspector to check the physical sensor connections.\n",
        "- Correlate with adjacent sensors for environmental anomalies.\n",
        "- Review camera feeds from the past 24 hours."
      ];
    }
    
    for (const word of words) {
      onChunk(word);
      // Simulate network delay between chunks
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

/**
 * Google Gemini Provider via native fetch (Zero-cost free tier).
 */
class GeminiProvider implements LLMProvider {
  private apiKey: string;
  // Default to gemini-flash-lite-latest for high-throughput reasoning
  private model: string = process.env.GEMINI_VISION_MODEL || 'gemini-flash-lite-latest'; 
  private baseUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private buildPayload(prompt: string, options?: GenerateOptions) {
    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        maxOutputTokens: options?.maxTokens ?? 1024,
      }
    };
    if (options?.systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      };
    }
    return payload;
  }

  async generateCompletion(prompt: string, options?: GenerateOptions): Promise<string> {
    logger.debug(`[LLM:Gemini] Generating completion using ${this.model}...`);
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
    
    let response: Response | null = null;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.buildPayload(prompt, options)),
        });

        if (response.ok) {
          break;
        }

        if (response.status === 429 || response.status >= 500) {
          const errorText = await response.text();
          lastError = new Error(`Gemini API Error: ${response.status} - ${errorText}`);
          logger.warn(`⚠️ [LLM:Gemini] Attempt ${attempts}/${maxAttempts} failed (${lastError.message}). Retrying...`);
          if (attempts < maxAttempts) {
            const delayMs = Math.pow(2, attempts) * 1000;
            await new Promise((r) => setTimeout(r, delayMs));
          }
        } else {
          const errorText = await response.text();
          throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }
      } catch (err: any) {
        lastError = err;
        logger.warn(`⚠️ [LLM:Gemini] Network error on attempt ${attempts}/${maxAttempts}: ${err.message}`);
        if (attempts < maxAttempts) {
          const delayMs = Math.pow(2, attempts) * 1000;
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error(`Gemini API failed after ${maxAttempts} attempts.`);
    }

    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async streamCompletion(prompt: string, onChunk: (chunk: string) => void, options?: GenerateOptions): Promise<void> {
    logger.debug(`[LLM:Gemini] Streaming completion using ${this.model}...`);
    const url = `${this.baseUrl}/${this.model}:streamGenerateContent?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.buildPayload(prompt, options)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[LLM:Gemini] Streaming API Error: ${response.status} - ${errorText}`);
      throw new Error(`Gemini Streaming API Error: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("No response body available for streaming");
    }

    // Process the stream (Gemini stream returns an array of JSON objects via SSE-like chunks)
    // Note: Gemini's REST streaming format involves an array of JSON objects being streamed.
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    let doneReading = false;
    while (!doneReading) {
      const { done, value } = await reader.read();
      if (done) {
        doneReading = true;
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      
      // A naive approach to extracting text from the Gemini JSON stream
      // Each chunk in the stream looks like a JSON array segment
      try {
        // Attempt to extract complete string literals that represent parts of the response
        // In a production scenario, a more robust streaming JSON parser is recommended.
        // For our free-tier abstraction, we capture the "text" field matches.
        const regex = /"text"\s*:\s*"([^"]+)"/g;
        let match;
        while ((match = regex.exec(buffer)) !== null) {
          // Unescape the JSON string
          try {
            const chunkText = JSON.parse(`"${match[1]}"`);
            onChunk(chunkText);
          } catch (e) {
             // Ignore malformed escapes in partial buffer
          }
        }
        // Clear buffer to avoid reprocessing (simplistic approach for demo)
        buffer = ''; 
      } catch (err) {
        // Wait for more data
      }
    }
  }
}

/**
 * Main LLM Service Factory
 */
export class LLMService {
  private static provider: LLMProvider;

  static getProvider(): LLMProvider {
    if (!this.provider) {
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (apiKey && apiKey !== 'mock' && apiKey.length > 5) {
        logger.info('[LLMService] Initializing Google Gemini Provider');
        this.provider = new GeminiProvider(apiKey);
      } else {
        logger.info('[LLMService] GEMINI_API_KEY not found or invalid. Falling back to MockProvider for zero-cost development.');
        this.provider = new MockProvider();
      }
    }
    return this.provider;
  }

  static isSimulated(): boolean {
    return this.getProvider() instanceof MockProvider;
  }

  static async generateCompletion(prompt: string, options?: GenerateOptions): Promise<string> {
    return this.getProvider().generateCompletion(prompt, options);
  }

  static async streamCompletion(prompt: string, onChunk: (chunk: string) => void, options?: GenerateOptions): Promise<void> {
    return this.getProvider().streamCompletion(prompt, onChunk, options);
  }
}
