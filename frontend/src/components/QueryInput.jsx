// Search input and submit button.
// On submit it calls onSubmit(query) — the parent fires both API calls simultaneously.
// Disables the input and button while loading.

import { useState } from 'react';
import styles from './QueryInput.module.css';

export default function QueryInput({ onSubmit, loading }) {
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const q = value.trim();
    if (!q || loading) return;
    onSubmit(q);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask anything about Transcend..."
        disabled={loading}
        autoFocus
      />
      <button className={styles.button} type="submit" disabled={loading || !value.trim()}>
        {loading ? <Spinner /> : 'Search'}
      </button>
    </form>
  );
}

function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" />;
}
