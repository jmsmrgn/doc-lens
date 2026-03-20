// Entry point for the doc-lens Express server.
// Exposes three endpoints:
//   POST /api/query-rag     — embed query → retrieve matching chunks → generate grounded answer
//   POST /api/query-no-rag  — generate answer from raw query with no retrieval context
//   GET  /api/health        — liveness check

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const embed = require('./embed');
const retrieve = require('./retrieve');
const generate = require('./generate');

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// CORS
// Allow local dev (localhost:5173) and any Vercel preview or production URL.
// Using a regex instead of a hardcoded URL avoids a chicken-and-egg problem:
// the frontend Vercel URL is unknown until it's deployed, and hardcoding it
// would require a backend redeploy after the fact. The regex covers all
// *.vercel.app subdomains, including preview deployment URLs automatically.
// ---------------------------------------------------------------------------

const VERCEL_ORIGIN = /^https:\/\/[a-z0-9-]+\.vercel\.app$/;
const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || LOCALHOST_ORIGIN.test(origin) || VERCEL_ORIGIN.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
  })
);

app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// POST /api/query-rag
// Embeds the user query, retrieves the top-matching chunks from Supabase,
// and calls gpt-4o-mini with those chunks injected into the system prompt.
app.post('/api/query-rag', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query must be a non-empty string' });
  }

  try {
    const embedding = await embed(query);
    const chunks = await retrieve(embedding);
    const answer = await generate(query, chunks);

    res.json({ answer, chunks });
  } catch (err) {
    console.error('/api/query-rag error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/query-no-rag
// Passes the raw query directly to gpt-4o-mini with no retrieval context.
// The model answers purely from its training data — the RAG OFF baseline.
app.post('/api/query-no-rag', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query must be a non-empty string' });
  }

  try {
    const answer = await generate(query, null);
    res.json({ answer });
  } catch (err) {
    console.error('/api/query-no-rag error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`doc-lens backend running on port ${PORT}`);
});
