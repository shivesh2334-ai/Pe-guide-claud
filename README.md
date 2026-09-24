# PE Assessment & Treatment Copilot

Clinical decision-support web app for acute pulmonary embolism (PE): risk
stratification, investigation planning, diagnosis context, and a
cause-directed treatment plan — including inherited thrombophilia and other
special populations.

Encodes: Weinberg AS, Rali P. "Acute pulmonary embolism in adults: Treatment
overview and prognosis." UpToDate, Topic 8265 Version 121.0. Literature
review current through Aug 2026; topic last updated Sep 11, 2026.

## What it does

1. **Risk stratification** — computes PESI / simplified PESI, then classifies
   the patient by both the 2019 ERS/ESC scheme (low / intermediate-low /
   intermediate-high / high) and the 2026 AHA/ACC A–E category scheme,
   including the respiratory modifier.
2. **Investigations** — recommends the imaging/biomarker workup needed to
   complete risk stratification, plus a targeted **thrombophilia / occult
   malignancy panel** (factor V Leiden, prothrombin G20210A, protein C/S,
   antithrombin, antiphospholipid antibodies) when the case is unprovoked,
   recurrent on therapeutic anticoagulation, or thrombophilia/APS is
   suspected.
3. **Diagnosis context** — plain-language summary of the case's severity
   classification and any special-population flags that change management
   (malignancy, pregnancy, HIT, antiphospholipid syndrome, inherited
   thrombophilia, subsegmental PE, right heart thrombus, concomitant DVT).
4. **Treatment plan** — anticoagulation indication/agent selection, IVC
   filter guidance, outpatient-eligibility screen, duration of therapy
   (including indefinite-therapy triggers), thrombolysis/embolectomy/PERT
   guidance by risk tier, monitoring, and a follow-up schedule (1 week / 3
   months / 1 year).
5. **Guideline references** — each run retrieves the specific source
   passages behind its recommendations via a lexical keyword retriever (see
   "About the retrieval layer" below) so every recommendation can be traced
   back to the attached guideline text.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS. No backend/database is
required to run the deterministic engine — everything computes client-side
from the guideline logic in `lib/engine.ts`.

## Retrieval layer: vector RAG (Supabase pgvector) with automatic fallback

v2 adds real embedding-based retrieval, with the v1 lexical retriever kept as
an automatic fallback so the app degrades gracefully if the vector backend
isn't configured (e.g. right after cloning, before you've set env vars).

**How it works:**
- `supabase/schema.sql` — creates a `guideline_chunks` table (pgvector column)
  and a `match_guideline_chunks` similarity-search RPC. Run this once in your
  Supabase project's SQL editor.
- `scripts/export-chunks.ts` + `scripts/ingest.js` — export the TypeScript
  corpus in `lib/guidelineKnowledgeBase.ts` to JSON, embed each chunk, and
  upsert into Supabase. Run `npm run ingest` any time you edit or add source
  chunks.
- `app/api/retrieve-guidelines/route.ts` — a server-only Route Handler that
  embeds the current case's query terms, calls the Supabase RPC for
  cosine-similarity search, and returns the top matches with similarity
  scores. If `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` /
  `EMBEDDINGS_API_KEY` are missing, or the call errors, it transparently
  falls back to the lexical retriever and says so in a `warning` field.
- `components/ResultsPanel.tsx` — calls that route on every assessment
  change and shows a badge ("Vector RAG (Supabase pgvector)" vs "Lexical
  keyword retrieval (fallback)") plus per-result similarity scores, so it's
  always visible which retrieval path served a given answer.

**Setup (one-time):**
1. Create a Supabase project (or reuse an existing one from your stack).
2. Supabase dashboard → SQL Editor → paste and run `supabase/schema.sql`.
3. Get your Project URL and `service_role` key from Settings → API.
4. Get an embeddings API key (OpenAI, or any OpenAI-compatible provider).
5. `cp .env.example .env.local` and fill in `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `EMBEDDINGS_API_KEY`.
6. `npm run ingest` — embeds and loads the 20 seed chunks into Supabase.
7. In Vercel → Project Settings → Environment Variables, set the same three
   variables for Production (and Preview, if you want it there too), then
   redeploy.

**Adding more source documents** (full ESC 2019 / AHA-ACC 2026 guideline
PDFs, your own institutional protocols, etc.): add entries with the shape
`{ id, heading, text, keywords }` to `lib/guidelineKnowledgeBase.ts`'s
`GUIDELINE_CHUNKS` array (a few hundred words per chunk is a good size), then
re-run `npm run ingest` to re-embed and upsert everything.

**Cost/ops note:** each assessment change triggers one embeddings API call
(a few hundred input tokens) plus one Supabase query — trivial cost at
individual-clinician usage, but if you expect heavy concurrent use, consider
debouncing the `ResultsPanel` fetch (currently fires on every form edit).

## Local development

```bash
npm install
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub (e.g. `shivesh2334-ai/pe-copilot`).
2. Import the repo in Vercel → framework preset "Next.js" is auto-detected.
3. Region: set to Mumbai (`bom1`) in Project Settings → Functions, to match
   your other deployments (this app has no serverless functions today, but
   the setting is there for when the v2 RAG backend is added).
4. No environment variables are required for v1.

## Disclaimer

This is clinical decision support only, encoding one UpToDate topic version.
It does not replace clinical judgment, institutional protocols, PERT/expert
consultation, or checking the current version of the source guideline
(literature reviewed through Aug 2026; society guidelines — ESC 2019,
AHA/ACC 2026 — evolve). Validate before any clinical use.
