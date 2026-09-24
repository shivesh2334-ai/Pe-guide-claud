// Server-side only. Calls an OpenAI-compatible embeddings endpoint.
// Works with OpenAI directly, or any provider that mirrors the
// POST /v1/embeddings request/response shape (Azure OpenAI, together.ai,
// self-hosted vLLM/TEI, etc) by overriding EMBEDDINGS_BASE_URL.
//
// Required env vars (set in Vercel Project Settings → Environment Variables,
// and in a local .env.local for the ingest script — see .env.example):
//   EMBEDDINGS_API_KEY   - API key for the embeddings provider
// Optional:
//   EMBEDDINGS_BASE_URL  - default "https://api.openai.com/v1"
//   EMBEDDINGS_MODEL     - default "text-embedding-3-small" (1536 dims,
//                          matches supabase/schema.sql's vector(1536))

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'text-embedding-3-small';

export interface EmbeddingConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function isEmbeddingConfigured(): boolean {
  return Boolean(process.env.EMBEDDINGS_API_KEY);
}

/** Embed a single string. Throws if the provider call fails — callers should catch and fall back. */
export async function embedText(text: string, config: EmbeddingConfig = {}): Promise<number[]> {
  const apiKey = config.apiKey ?? process.env.EMBEDDINGS_API_KEY;
  const baseUrl = config.baseUrl ?? process.env.EMBEDDINGS_BASE_URL ?? DEFAULT_BASE_URL;
  const model = config.model ?? process.env.EMBEDDINGS_MODEL ?? DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error('EMBEDDINGS_API_KEY is not set — cannot call embeddings endpoint.');
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Embeddings request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding)) {
    throw new Error('Embeddings response did not contain a usable vector.');
  }
  return embedding as number[];
}

/** Embed many strings in one request (used by the ingest script). */
export async function embedBatch(texts: string[], config: EmbeddingConfig = {}): Promise<number[][]> {
  const apiKey = config.apiKey ?? process.env.EMBEDDINGS_API_KEY;
  const baseUrl = config.baseUrl ?? process.env.EMBEDDINGS_BASE_URL ?? DEFAULT_BASE_URL;
  const model = config.model ?? process.env.EMBEDDINGS_MODEL ?? DEFAULT_MODEL;

  if (!apiKey) {
    throw new Error('EMBEDDINGS_API_KEY is not set — cannot call embeddings endpoint.');
  }

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Embeddings request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  if (!Array.isArray(data?.data)) throw new Error('Embeddings response missing data array.');
  interface EmbeddingDatum { index: number; embedding: number[] }
  return (data.data as EmbeddingDatum[])
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
