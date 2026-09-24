/**
 * Ingest script: embeds lib/guidelineKnowledgeBase.ts's GUIDELINE_CHUNKS (and
 * any additional documents you add — see "Adding more source documents"
 * below) and upserts them into the Supabase `guideline_chunks` table.
 *
 * Run locally (never in the browser/Vercel build):
 *   1. cp .env.example .env.local   and fill in the values
 *   2. npm run ingest
 *
 * Re-run any time you edit GUIDELINE_CHUNKS or add new source documents —
 * it upserts by chunk id, so it's safe to run repeatedly.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBEDDINGS_API_KEY = process.env.EMBEDDINGS_API_KEY;
const EMBEDDINGS_BASE_URL = process.env.EMBEDDINGS_BASE_URL || 'https://api.openai.com/v1';
const EMBEDDINGS_MODEL = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local — see .env.example.');
  process.exit(1);
}
if (!EMBEDDINGS_API_KEY) {
  console.error('Missing EMBEDDINGS_API_KEY in .env.local — see .env.example.');
  process.exit(1);
}

async function embedBatch(texts) {
  const res = await fetch(`${EMBEDDINGS_BASE_URL.replace(/\/$/, '')}/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EMBEDDINGS_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDINGS_MODEL, input: texts }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Embeddings request failed (${res.status}): ${body.slice(0, 500)}`);
  }
  const data = await res.json();
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// --- Load chunks -----------------------------------------------------------
// This script reads `guidelineChunks.generated.json`.
// Run `npm run export-chunks` to regenerate that file from
// `lib/guidelineKnowledgeBase.ts` before ingesting.
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'guidelineChunks.generated.json');
if (!fs.existsSync(jsonPath)) {
  console.error(
    'guidelineChunks.generated.json not found. Run "npm run export-chunks" first ' +
    '(regenerates it from lib/guidelineKnowledgeBase.ts).'
  );
  process.exit(1);
}
const chunks = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// --- Adding more source documents ------------------------------------------
// To ingest additional guideline PDFs/text (e.g. the full 2019 ESC or 2026
// AHA/ACC guideline, or your own institutional protocol), add entries with
// the same shape { id, heading, text, keywords } to
// guidelineChunks.generated.json (or extend GUIDELINE_CHUNKS in
// lib/guidelineKnowledgeBase.ts and re-run "npm run export-chunks"), keeping
// chunks to roughly one section/paragraph each (a few hundred words) for
// good retrieval granularity.

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log(`Embedding ${chunks.length} chunks with model "${EMBEDDINGS_MODEL}"...`);
  const BATCH = 20;
  const rows = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeddings = await embedBatch(batch.map((c) => `${c.heading}\n${c.text}`));
    batch.forEach((c, j) => {
      rows.push({
        id: c.id,
        heading: c.heading,
        content: c.text,
        keywords: c.keywords || [],
        embedding: embeddings[j],
      });
    });
    console.log(`  embedded ${Math.min(i + BATCH, chunks.length)}/${chunks.length}`);
  }

  console.log('Upserting into Supabase (table: guideline_chunks)...');
  const { error } = await supabase.from('guideline_chunks').upsert(rows, { onConflict: 'id' });
  if (error) {
    console.error('Upsert failed:', error);
    process.exit(1);
  }
  console.log(`Done. Upserted ${rows.length} rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
