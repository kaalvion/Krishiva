import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class GrokError extends Error {
  statusCode: number;
  retryable: boolean;
  responseBody?: string;

  constructor(message: string, statusCode: number, retryable: boolean, responseBody?: string) {
    super(message);
    this.name = 'GrokError';
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.responseBody = responseBody;
  }
}

/**
 * Checks whether Grok AI features are enabled and configured with an API key.
 */
export function isGrokEnabled(): boolean {
  return env.AI_ENABLED === 'true' && Boolean(env.GROK_API_KEY && env.GROK_API_KEY.trim());
}

/**
 * Calls Grok (OpenAI-compatible /chat/completions endpoint) with timeout and retry logic.
 */
export async function callGrok(
  messages: ChatMessage[],
  options: {
    temperature?: number;
    max_tokens?: number;
    model?: string;
  } = {}
): Promise<string> {
  if (!isGrokEnabled()) {
    throw new GrokError('Grok AI is not enabled or GROK_API_KEY is not configured', 400, false);
  }

  const apiKey = env.GROK_API_KEY;
  const baseUrl = env.GROK_BASE_URL.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const model = options.model || env.GROK_MODEL;

  const maxAttempts = 3; // 1 initial + 2 retries
  const backoffDelays = [1000, 3000];

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      logger.debug({ attempt, model }, 'Dispatching Grok chat completion request');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options.temperature ?? 0.2,
          max_tokens: options.max_tokens ?? 500,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        const statusCode = response.status;
        const retryable = statusCode === 429 || statusCode >= 500;

        logger.warn(
          { statusCode, durationMs, attempt, errorText },
          'Grok API returned error response'
        );

        const grokErr = new GrokError(
          `Grok API returned status ${statusCode}: ${errorText}`,
          statusCode,
          retryable,
          errorText
        );

        if (!retryable || attempt === maxAttempts) {
          throw grokErr;
        }

        lastError = grokErr;
      } else {
        const json = (await response.json()) as any;
        const text = json?.choices?.[0]?.message?.content ?? '';
        const usage = json?.usage;

        logger.info(
          {
            durationMs,
            promptTokens: usage?.prompt_tokens,
            completionTokens: usage?.completion_tokens,
            totalTokens: usage?.total_tokens,
            model,
          },
          'Grok request completed successfully'
        );

        return text;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      if (err instanceof GrokError && !err.retryable) {
        throw err;
      }

      logger.warn(
        { attempt, durationMs, err: err?.message, isAbort: err?.name === 'AbortError' },
        'Grok attempt encountered an error'
      );

      lastError = err;
      if (attempt === maxAttempts) {
        break;
      }
    }

    // Wait before retry
    const delay = backoffDelays[attempt - 1] ?? 3000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw lastError instanceof GrokError
    ? lastError
    : new GrokError(
        lastError?.message || 'Grok call failed after retries',
        lastError?.name === 'AbortError' ? 408 : 500,
        false
      );
}

