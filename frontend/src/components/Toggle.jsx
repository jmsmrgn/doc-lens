// RAG mode toggle switch.
// Controls whether the RAG result panel is visible alongside the base LLM panel.
// Default state is ON (both panels shown). Label reflects current state.

import styles from './Toggle.module.css';

export default function Toggle({ enabled, onChange }) {
  return (
    <div className={styles.wrapper}>
      <span className={`${styles.label} ${enabled ? styles.labelOn : styles.labelOff}`}>
        RAG: {enabled ? 'ON' : 'OFF'}
      </span>
      <button
        className={`${styles.track} ${enabled ? styles.trackOn : ''}`}
        role="switch"
        aria-checked={enabled}
        aria-label="Toggle RAG mode"
        onClick={() => onChange(!enabled)}
      >
        <span className={styles.thumb} />
      </button>
    </div>
  );
}
