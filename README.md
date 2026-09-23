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

Next.js 16 (App Router) · TypeScript · Tailwind CSS. No backend/database is
required to run the deterministic engine — everything computes client-side
from the guideline logic in `lib/engine.ts`.

## About the retrieval layer (important caveat)

You asked for RAG "from guidelines and information attached." What's shipped
here (`lib/guidelineKnowledgeBase.ts`) is a **lexical keyword retriever**
over ~20 hand-chunked passages from the UpToDate topic you pasted in — it
scores chunks by keyword overlap with the current case's risk category and
flags, not by vector similarity. It needs no API key and works entirely
offline/client-side, which is why it was the fastest path to a working v1.

If you want *real* embedding-based RAG (e.g., so you can later drop in more
source documents — ESC 2019 full guideline PDF, AHA/ACC 2026 full guideline,
local hospital protocols — and have it retrieve semantically rather than by
keyword), the natural upgrade given your stack is:
- Chunk documents → embed with an OpenAI-compatible embeddings endpoint →
  store vectors in **Supabase pgvector** (you're already using Supabase
  elsewhere) → replace `retrieveGuidelineChunks()` in
  `lib/guidelineKnowledgeBase.ts` with a call to a `match_documents` RPC.
- That requires an embeddings API key as a Vercel environment variable,
  which I didn't want to assume/fabricate here.

Say the word and I'll wire that up as a v2 (same UI, swapped retrieval
backend).

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
