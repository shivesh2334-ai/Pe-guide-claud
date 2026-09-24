import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isEmbeddingConfigured, embedText } from '@/lib/embeddings';
import { retrieveGuidelineChunks, GUIDELINE_CHUNKS } from '@/lib/guidelineKnowledgeBase';

export const runtime = 'nodejs';

export interface RetrievedReference {
  chunkId: string;
  heading: string;
  text: string;
  similarity: number | null; // null when served by the lexical fallback (no comparable score)
  source: 'vector' | 'lexical';
}

interface MatchRow {
  id: string;
  heading: string;
  content: string;
  source: string;
  similarity: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const queryTerms: string[] = Array.isArray(body?.queryTerms) ? body.queryTerms : [];
  const topN: number = typeof body?.topN === 'number' ? body.topN : 6;

  const backendReady = isSupabaseConfigured() && isEmbeddingConfigured();

  if (backendReady) {
    try {
      const query = queryTerms.join(', ');
      const embedding = await embedText(query);
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.rpc('match_guideline_chunks', {
        query_embedding: embedding,
        match_count: topN,
        min_similarity: 0.0,
      });
      if (error) throw error;

      const results: RetrievedReference[] = (data ?? []).map((row: MatchRow) => ({
        chunkId: row.id,
        heading: row.heading,
        text: row.content,
        similarity: row.similarity,
        source: 'vector',
      }));

      return NextResponse.json({ backend: 'vector', results });
    } catch (err: unknown) {
      // Fall through to lexical retrieval below; report the failure so the UI can surface it.
      const lexical = retrieveGuidelineChunks(queryTerms, topN);
      const results: RetrievedReference[] = lexical.map((c) => ({
        chunkId: c.id,
        heading: c.heading,
        text: c.text,
        similarity: null,
        source: 'lexical',
      }));
      return NextResponse.json({
        backend: 'lexical',
        results,
        warning: `Vector backend configured but the call failed, fell back to lexical retrieval: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const lexical = retrieveGuidelineChunks(queryTerms, topN);
  const results: RetrievedReference[] = lexical.map((c) => ({
    chunkId: c.id,
    heading: c.heading,
    text: c.text,
    similarity: null,
    source: 'lexical',
  }));
  return NextResponse.json({
    backend: 'lexical',
    results,
    warning: 'Vector backend not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / EMBEDDINGS_API_KEY missing) — serving lexical keyword retrieval. See README "Upgrading to vector RAG".',
  });
}

// Simple health check so the frontend can show backend status without a full retrieval call.
export async function GET() {
  return NextResponse.json({
    vectorBackendConfigured: isSupabaseConfigured() && isEmbeddingConfigured(),
    corpusSize: GUIDELINE_CHUNKS.length,
  });
}
