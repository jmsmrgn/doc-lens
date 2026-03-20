// Generates a vector embedding for a given text string using OpenAI's
// text-embedding-3-small model. Called by /api/query-rag before retrieval.
// Returns a 1536-dimension float array that encodes the semantic meaning of the input.

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function embed(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    encoding_format: 'float',
  });

  return response.data[0].embedding;
};
