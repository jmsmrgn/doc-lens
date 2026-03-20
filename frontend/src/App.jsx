// Root application component.
// Manages query state, fires both API calls simultaneously, and composes
// the QueryInput, Toggle, and ResultPanel into the full demo layout.

import { useState } from 'react';
import QueryInput from './components/QueryInput';
import Toggle from './components/Toggle';
import ResultPanel from './components/ResultPanel';
import { queryWithRAG, queryWithoutRAG } from './api';
import styles from './App.module.css';

export default function App() {
  const [ragEnabled, setRagEnabled] = useState(true);
  const [loading, setLoading]       = useState(false);
  const [ragResult, setRagResult]   = useState(null);
  const [baseResult, setBaseResult] = useState(null);
  const [error, setError]           = useState(null);

  async function handleSubmit(query) {
    setLoading(true);
    setError(null);
    setRagResult(null);
    setBaseResult(null);

    try {
      const [rag, base] = await Promise.all([
        queryWithRAG(query),
        queryWithoutRAG(query),
      ]);
      setRagResult(rag);
      setBaseResult(base);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasActivity = loading || ragResult || baseResult;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.wordmark}>
          doc<span className={styles.dash}>-</span>lens
        </h1>
        <p className={styles.subtitle}>
          Retrieval-Augmented Generation on Transcend Documentation
        </p>
      </header>

      <main className={styles.main}>
        <div className={styles.controls}>
          <QueryInput onSubmit={handleSubmit} loading={loading} />
          <Toggle enabled={ragEnabled} onChange={setRagEnabled} />
        </div>

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}

        {hasActivity && (
          <div className={ragEnabled ? styles.dualGrid : styles.singleGrid}>
            {ragEnabled && (
              <ResultPanel
                title="With RAG"
                answer={ragResult?.answer}
                chunks={ragResult?.chunks}
                loading={loading}
                variant="rag"
              />
            )}
            <ResultPanel
              title="Without RAG"
              answer={baseResult?.answer}
              loading={loading}
              variant="base"
            />
          </div>
        )}
      </main>
    </div>
  );
}
