# doc-lens

doc-lens is a working RAG (Retrieval-Augmented Generation — a technique where an LLM is given relevant document passages at query time instead of relying on training data alone) system built over Transcend's public documentation. It scrapes and indexes the docs into a vector database (a database that stores meaning as numbers so semantically similar content is physically close together), retrieves the most relevant passages on each query, and injects them into the prompt before generating an answer. A toggle runs the same question through both paths — RAG on and RAG off — so you can see the difference directly.

## Architecture

Two phases: prep runs once, query runs on every request.

**Prep phase — index the docs:**
```
Transcend Docs → Firecrawl → Chunker → OpenAI Embeddings → Supabase pgvector
```

**Query phase — answer a question:**
```
User Query ──► Embed Query ──► Vector Search ──► Supabase pgvector
     │                                                   │
     │                              Retrieved Chunks ◄───┘
     │                                      │
     └──────────────────────────────────────► gpt-4o-mini ──► Answer
```

## Stack

| Layer | Technology | Reason |
|---|---|---|
| Scraping | Firecrawl | Handles JS-rendered pages, outputs clean markdown |
| Embeddings | OpenAI text-embedding-3-small | Fast, cheap, same SDK as generation |
| Generation | OpenAI gpt-4o-mini | Low cost, strong instruction following |
| Vector database | Supabase pgvector | SQL-native, visual dashboard, single RPC call to retrieve |
| Backend | Node + Express | Lightweight REST API, no framework overhead |
| Frontend | React + Vite | Fast scaffold, clean component structure |
| Deployment | Vercel | Zero config, instant public URLs |

## Quick Start

**1. Clone the repo**

```bash
git clone git@github.com:jmsmrgn/doc-lens.git
cd doc-lens
```

**2. Install dependencies**

```bash
pnpm install --prefix backend
pnpm install --prefix frontend
```

The project keeps separate `node_modules` for backend and frontend — the backend is CommonJS (Node/Express) and the frontend is ESM (Vite), which conflict if merged. Both installs run from the repo root so you never have to `cd` into subdirectories.

**3. Set up Supabase**

Create a project at [supabase.com](https://supabase.com), then run the contents of `backend/schema.sql` in the SQL editor. This creates the `documents` table and the `match_documents` function used for vector search.

**4. Configure environment variables**

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in `backend/.env` with your OpenAI API key, Supabase project URL, and Supabase service role key. `frontend/.env` works as-is for local development.

**5. Run the ingestion pipeline**

```bash
node backend/ingest.js
```

Reads every markdown file in `scraped_docs/`, splits each into overlapping ~500-token chunks, generates an embedding per chunk via OpenAI, and inserts everything into Supabase. Run once. Takes a couple of minutes.

**6. Start the app**

```bash
pnpm dev
```

Runs both backend and frontend concurrently from the repo root. Backend starts on port 3001, frontend opens at `http://localhost:5173`.

## How the Demo Works

Submit a question and three panels populate.

**RAG OFF** — The query goes directly to gpt-4o-mini with no context. The model answers from its training data, which doesn't include Transcend's internal documentation. For specific questions — exact parameter names, config values, feature-specific behavior — the answer is a confident-sounding guess.

**RAG ON** — The query is first converted to an embedding (a numerical representation of its meaning), used to search Supabase for the five most semantically similar chunks from the docs, and those chunks are injected into the system prompt before generation. The model reads the actual documentation and answers from it.

**Retrieved Context** — The third panel shows which chunks were retrieved and their similarity scores. You can see which passages the model was given and why the same model produces two different answers to the same question.

The toggle isolates the variable. Same model, same question, same parameters — the only difference is whether the model has access to the relevant documentation.

## Key Concepts

**Embeddings** — A way of converting text into a list of numbers (a vector) that represents meaning. Two sentences that mean the same thing produce vectors that are mathematically close, even if they share no words. `text-embedding-3-small` is the OpenAI model that does this conversion.

**Vector database** — A database that stores these number lists and can find the ones closest to a query vector. "Closest" means most semantically similar — not most keyword-overlapping. Supabase pgvector uses cosine similarity (the angle between two vectors in high-dimensional space) to rank matches.

**Retrieval-Augmented Generation (RAG)** — A pattern where you retrieve relevant document passages and hand them to an LLM as context before asking it to generate an answer. The model isn't recalling from memory — it's reading. That's what makes the answer grounded instead of made up.
