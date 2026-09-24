// Regenerates scripts/guidelineChunks.generated.json from the single source
// of truth, lib/guidelineKnowledgeBase.ts. Run with: npm run export-chunks
import fs from 'fs';
import path from 'path';
import { GUIDELINE_CHUNKS } from '../lib/guidelineKnowledgeBase';

const outPath = path.join(__dirname, 'guidelineChunks.generated.json');
fs.writeFileSync(outPath, JSON.stringify(GUIDELINE_CHUNKS, null, 2));
console.log(`Wrote ${GUIDELINE_CHUNKS.length} chunks to ${outPath}`);
