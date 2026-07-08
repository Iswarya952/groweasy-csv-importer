import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
const maxRetries = Number(process.env.AI_MAX_RETRIES || 3);
const retryDelayMs = Number(process.env.AI_RETRY_DELAY_MS || 1000);

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[gemini.service] GEMINI_API_KEY is not set. AI extraction calls will fail until it is configured in .env'
  );
}

const genAI = new GoogleGenerativeAI(apiKey || '');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sends a prompt to Gemini and returns the raw text response.
 * Retries with exponential backoff on transient failures (rate limits,
 * timeouts, 5xx errors) up to AI_MAX_RETRIES times.
 */
export async function callGemini(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1, // low temperature: we want consistent structured mapping, not creativity
      responseMimeType: 'application/json',
    },
  });

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text || !text.trim()) {
        throw new Error('Empty response from Gemini');
      }
      return text;
    } catch (err) {
      lastError = err;
      const isLastAttempt = attempt === maxRetries;
      // eslint-disable-next-line no-console
      console.warn(
        `[gemini.service] Attempt ${attempt}/${maxRetries} failed: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      if (!isLastAttempt) {
        await sleep(retryDelayMs * attempt); // exponential-ish backoff
      }
    }
  }

  throw new Error(
    `Gemini call failed after ${maxRetries} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}
