// Calls OpenAI gpt-4o-mini to generate a natural language answer.
//
// RAG mode (chunks provided): the retrieved document chunks are injected into the
// system prompt as context. The model is instructed to answer using only that context,
// which grounds the response in the actual documentation.
//
// Base LLM mode (chunks null): the model answers from its training data alone with no
// retrieval context. This is the RAG OFF baseline used for comparison in the demo.

const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

module.exports = async function generate(query, chunks = null) {
  let systemPrompt = 'You are a helpful assistant.';

  if (chunks && chunks.length > 0) {
    const context = chunks.map((c) => c.content).join('\n\n---\n\n');
    systemPrompt =
      'You are a documentation assistant for Transcend\'s platform. ' +
      'Answer questions directly and authoritatively based on the documentation provided. ' +
      'Do not preface your answer with phrases like "The context mentions" or "According to the context" — just answer. ' +
      'Use markdown formatting in your response, including fenced code blocks with language identifiers for any code examples. ' +
      'If the answer is not covered in the documentation provided, say so clearly.\n\nDocumentation:\n' +
      context;
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ],
  });

  return response.choices[0].message.content;
};
