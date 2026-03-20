// HTTP client for the doc-lens backend.
// BASE_URL falls back to localhost:3001 for local development.
// Set VITE_API_URL in .env.local (or Vercel env vars) for production.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function queryWithRAG(query) {
  const res = await fetch(`${BASE_URL}/api/query-rag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export async function queryWithoutRAG(query) {
  const res = await fetch(`${BASE_URL}/api/query-no-rag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}
