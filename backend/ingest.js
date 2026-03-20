// Ingestion pipeline for doc-lens.
// Reads every scraped markdown file, splits it into overlapping text chunks,
// generates a vector embedding for each chunk via OpenAI, and inserts the
// results into the Supabase `documents` table. Run this once before starting
// the backend server. It is safe to re-run on a fresh (empty) table.
//
// Run with: node ingest.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCRAPED_DIR = path.join(__dirname, 'scraped_docs');

// Token approximation: 1 token ≈ 0.75 words
const MAX_TOKENS = 500;
const OVERLAP_TOKENS = 50;
const MAX_WORDS = Math.floor(MAX_TOKENS / 0.75);     // ~667 words
const OVERLAP_WORDS = Math.ceil(OVERLAP_TOKENS / 0.75); // ~67 words
const CHUNK_STRIDE = MAX_WORDS - OVERLAP_WORDS;         // ~600 words

const BATCH_SIZE = 20;       // chunks per OpenAI batch
const BATCH_DELAY_MS = 500;  // ms between batches to avoid rate limits
const MIN_CHUNK_LENGTH = 80; // skip chunks shorter than this (likely nav noise)

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

// Splits a document into overlapping word windows. Returns an array of
// { content: string, chunkIndex: number } objects.
function chunkDocument(text) {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const chunks = [];

  for (let i = 0; i < words.length; i += CHUNK_STRIDE) {
    const slice = words.slice(i, i + MAX_WORDS);
    const content = slice.join(' ');

    if (content.length >= MIN_CHUNK_LENGTH) {
      chunks.push({ content, chunkIndex: chunks.length });
    }

    // Stop if this window reached the end of the document
    if (i + MAX_WORDS >= words.length) break;
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// URL derivation
// ---------------------------------------------------------------------------

// Reverses the filename slug back into an approximate source URL.
// The slug was created by: strip domain → replace "/" with "_" → strip leading/trailing "_"
// Hyphens in the original URL are preserved in the slug, so this reversal is accurate.
function deriveSourceUrl(filename) {
  const slug = filename.replace(/\.md$/, '').replace(/_/g, '/');
  return `https://docs.transcend.io/${slug}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Validate env
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');
  if (!process.env.SUPABASE_URL) throw new Error('SUPABASE_URL is not set');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  // Read files
  const files = fs
    .readdirSync(SCRAPED_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  if (files.length === 0) {
    console.error('No .md files found in', SCRAPED_DIR);
    process.exit(1);
  }

  console.log(`Found ${files.length} files in scraped_docs/\n`);

  // Build the full chunk list across all files
  const allChunks = [];

  for (const filename of files) {
    const text = fs.readFileSync(path.join(SCRAPED_DIR, filename), 'utf8');
    const chunks = chunkDocument(text);
    const sourceUrl = deriveSourceUrl(filename);

    for (const chunk of chunks) {
      allChunks.push({
        content: chunk.content,
        metadata: {
          source: filename,
          chunkIndex: chunk.chunkIndex,
          sourceUrl,
        },
      });
    }
  }

  console.log(`Total chunks to ingest: ${allChunks.length}`);
  console.log(`Batch size: ${BATCH_SIZE} | Batches: ${Math.ceil(allChunks.length / BATCH_SIZE)}\n`);

  // Process in batches
  let totalIngested = 0;

  for (let batchStart = 0; batchStart < allChunks.length; batchStart += BATCH_SIZE) {
    const batch = allChunks.slice(batchStart, batchStart + BATCH_SIZE);
    const rows = [];

    // Generate one embedding per chunk in the batch
    for (const chunk of batch) {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk.content,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      rows.push({
        content: chunk.content,
        metadata: chunk.metadata,
        embedding,
      });

      totalIngested++;
      console.log(
        `Ingested chunk ${totalIngested} of ${allChunks.length} from ${chunk.metadata.source}`
      );
    }

    // Insert batch into Supabase
    const { error } = await supabase.from('documents').insert(rows);

    if (error) {
      console.error('\nSupabase insert error:', error.message);
      throw new Error(error.message);
    }

    // Pause between batches (skip after the last one)
    if (batchStart + BATCH_SIZE < allChunks.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  // Summary
  console.log('\n--- Ingestion complete ---');
  console.log(`Files processed:      ${files.length}`);
  console.log(`Chunks created:       ${allChunks.length}`);
  console.log(`Embeddings generated: ${totalIngested}`);
}

main().catch((err) => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
