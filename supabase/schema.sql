-- Run this once in the Supabase SQL editor for your project.
-- Enables pgvector and creates the table + similarity-search RPC used by
-- app/api/retrieve-guidelines/route.ts.

create extension if not exists vector;

create table if not exists guideline_chunks (
  id text primary key,                 -- stable chunk id, e.g. 'risk-ers-esc'
  heading text not null,
  content text not null,
  source text not null default 'Weinberg AS, Rali P. Acute pulmonary embolism in adults: Treatment overview and prognosis. UpToDate, Topic 8265 Version 121.0.',
  keywords text[] not null default '{}',
  embedding vector(1536),              -- matches OpenAI text-embedding-3-small; change dim if you use a different model
  updated_at timestamptz not null default now()
);

-- Vector index for cosine similarity search (IVFFLAT; fine for a corpus this size).
create index if not exists guideline_chunks_embedding_idx
  on guideline_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- Similarity search RPC called from the API route.
create or replace function match_guideline_chunks(
  query_embedding vector(1536),
  match_count int default 6,
  min_similarity float default 0.0
)
returns table (
  id text,
  heading text,
  content text,
  source text,
  similarity float
)
language sql stable
as $$
  select
    guideline_chunks.id,
    guideline_chunks.heading,
    guideline_chunks.content,
    guideline_chunks.source,
    1 - (guideline_chunks.embedding <=> query_embedding) as similarity
  from guideline_chunks
  where guideline_chunks.embedding is not null
    and 1 - (guideline_chunks.embedding <=> query_embedding) >= min_similarity
  order by guideline_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Row Level Security: keep this table readable only via the service role
-- (used server-side in the Next.js route handler and the ingest script).
alter table guideline_chunks enable row level security;
-- No policies are added, so all access goes through the service role key,
-- which bypasses RLS. Do not expose the service role key to the browser.
