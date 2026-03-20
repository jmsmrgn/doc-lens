-- Step 1: Enable the pgvector extension.
-- pgvector adds a new column type called "vector" to Postgres, which lets you
-- store a list of floating-point numbers (an embedding) as a single column value.
-- Without this, Postgres has no concept of vector math or similarity search.
create extension if not exists vector;


-- Step 2: Create the documents table.
-- Each row is one chunk of documentation. "content" holds the raw text,
-- "metadata" holds anything extra we want to store (source URL, filename, chunk index),
-- and "embedding" holds the 1536-dimension vector that represents the chunk's meaning.
create table if not exists documents (
  id        bigserial primary key,
  content   text             not null,
  metadata  jsonb            not null default '{}',
  embedding vector(1536)     not null
);


-- Step 3: Create an HNSW index on the embedding column.
-- An index makes similarity search fast. Without it, Postgres would compare
-- every row one by one (a full table scan). HNSW (Hierarchical Navigable Small World)
-- builds a graph structure that lets it find the closest vectors in milliseconds.
-- We use vector_cosine_ops because cosine similarity is the right distance metric
-- for OpenAI embeddings — it measures the angle between vectors, not raw distance.
-- HNSW works correctly at any dataset size, unlike ivfflat which needs ~1,000+ rows.
create index if not exists documents_embedding_idx
  on documents
  using hnsw (embedding vector_cosine_ops);


-- Step 4: Create the match_documents function.
-- This is the single function the backend calls to do retrieval.
-- It takes: a query embedding (the user's question converted to a vector),
-- a similarity threshold (only return chunks above this score), and
-- a count limit (max number of chunks to return).
-- It returns the matching rows plus their similarity score, ordered best-first.
-- The "1 - (embedding <=> query_embedding)" expression converts cosine distance
-- (lower = more similar) into cosine similarity (higher = more similar).
create or replace function match_documents (
  query_embedding   vector(1536),
  match_threshold   float,
  match_count       int
)
returns table (
  id          bigint,
  content     text,
  metadata    jsonb,
  similarity  float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
