// Displays an answer from either the RAG or base LLM endpoint.
// RAG variant (variant="rag") includes a collapsible section showing the
// retrieved source chunks — the evidence behind the answer.
// Base variant (variant="base") shows the answer only.

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styles from './ResultPanel.module.css';

export default function ResultPanel({ title, answer, chunks, loading, variant }) {
  const isRag = variant === 'rag';

  return (
    <div className={`${styles.panel} ${isRag ? styles.panelRag : styles.panelBase}`}>
      <div className={styles.panelHeader}>
        <span className={`${styles.indicator} ${isRag ? styles.indicatorRag : styles.indicatorBase}`} />
        <h2 className={styles.panelTitle}>{title}</h2>
        {isRag && chunks && !loading && (
          <span className={styles.chunkCount}>{chunks.length} chunk{chunks.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div className={styles.body}>
        {loading ? (
          <Skeleton />
        ) : answer ? (
          <>
            <div className={styles.answer}>
              <ReactMarkdown
                components={{
                  code({ className, children }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return match ? (
                      <SyntaxHighlighter
                        style={oneLight}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ borderRadius: '6px', fontSize: '0.82rem', margin: '0.75rem 0' }}
                      >
                        {String(children).trimEnd()}
                      </SyntaxHighlighter>
                    ) : (
                      <code className={styles.inlineCode}>{children}</code>
                    );
                  },
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>
            {isRag && chunks && chunks.length > 0 && (
              <ChunkSection chunks={chunks} />
            )}
            {isRag && chunks && chunks.length === 0 && (
              <p className={styles.noChunks}>No matching chunks retrieved above threshold.</p>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function ChunkSection({ chunks }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.chunkSection}>
      <button
        className={styles.chunkToggle}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>›</span>
        Retrieved Context
      </button>

      {open && (
        <div className={styles.chunkList}>
          {chunks.map((chunk, i) => (
            <ChunkCard key={i} chunk={chunk} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChunkCard({ chunk }) {
  const filename = chunk.metadata?.source || 'unknown';
  const sourceUrl = chunk.metadata?.sourceUrl;
  const score = chunk.similarity != null ? (chunk.similarity * 100).toFixed(1) : null;
  // Truncate long snippets to keep cards compact
  const preview = chunk.content.length > 300
    ? chunk.content.slice(0, 300).trimEnd() + '…'
    : chunk.content;

  return (
    <div className={styles.chunkCard}>
      <p className={styles.chunkContent}>{preview}</p>
      <div className={styles.chunkMeta}>
        {sourceUrl ? (
          <a
            className={styles.chunkSource}
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            {filename}
          </a>
        ) : (
          <span className={styles.chunkSource}>{filename}</span>
        )}
        {score && <span className={styles.chunkScore}>{score}%</span>}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skBar} ${styles.skLong}`} />
      <div className={`${styles.skBar} ${styles.skMed}`} />
      <div className={`${styles.skBar} ${styles.skLong}`} />
      <div className={`${styles.skBar} ${styles.skShort}`} />
      <div className={`${styles.skBar} ${styles.skMed}`} />
    </div>
  );
}
