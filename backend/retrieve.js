// Queries the Supabase match_documents RPC function with a query embedding vector.
// Returns the top N chunks ordered by cosine similarity, filtered above a threshold.
//
// MATCH_THRESHOLD is defined here as a named constant so it can be tuned during demo
// prep without hunting through route handlers. 0.5 is intentionally permissive —
// useful chunks routinely score 0.55–0.65 in practice, and 0.7 risks returning zero
// results at demo scale (~259 chunks).

const { createClient } = require('@supabase/supabase-js');

const MATCH_THRESHOLD = 0.4;
const MATCH_COUNT = 5;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function retrieve(queryEmbedding) {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) throw new Error(`Supabase retrieval error: ${error.message}`);

  return data;
};
