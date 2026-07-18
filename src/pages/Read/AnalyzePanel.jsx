import { useState } from 'react';
import PropTypes from 'prop-types';
import { useLexicalAnalyze } from './useLexicalAnalyze.js';
import './AnalyzePanel.css';

export default function AnalyzePanel({ initialQuery = '', onCraftAction }) {
  const [query, setQuery] = useState(initialQuery);
  const { result, loading, error, submit, clear } = useLexicalAnalyze();

  const onSubmit = (e) => { e.preventDefault(); submit(query); }; // submit-only

  return (
    <div className="az-panel">
      <form className="az-search" onSubmit={onSubmit}>
        <input
          className="az-search__input" value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Analyze a word, phrase, or concept…" aria-label="Analyze query"
        />
        <button className="az-search__go" type="submit" disabled={loading || !query.trim()}>
          {loading ? '…' : 'Search'}
        </button>
        {result && <button type="button" className="az-search__clear" onClick={() => { setQuery(''); clear(); }}>×</button>}
      </form>

      {error && <div className="az-error">{error}</div>}
      {result && (
        <div className="az-groups">
          {result.groups.map((g) => (
            <section key={g.key} className="az-group">
              <h3 className="az-group__title">{g.label} <span className="az-group__count">{g.items.length}</span></h3>
              {g.items.length === 0 ? (
                <p className="az-empty">{g.emptyReason}</p>
              ) : (
                <ul className="az-list">
                  {g.items.map((it, i) => (
                    <li key={`${g.key}-${i}`} className={`az-item${it.derived ? ' az-item--derived' : ''}`}>
                      <span className="az-item__text">{it.text}</span>
                      <span className="az-item__meta">
                        <span className="az-chip" title={it.note || ''}>{it.source}</span>
                        {it.derived && <span className="az-chip az-chip--loose">loose</span>}
                      </span>
                      <span className="az-actions">
                        <button type="button" onClick={() => onCraftAction?.({ action: 'insert', item: it })} title="Insert at cursor">⤵</button>
                        <button type="button" onClick={() => onCraftAction?.({ action: 'replace', item: it })} title="Replace selection">⇄</button>
                        <button type="button" onClick={() => onCraftAction?.({ action: 'pin', item: it })} title="Pin">📌</button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

AnalyzePanel.propTypes = {
  initialQuery: PropTypes.string,
  onCraftAction: PropTypes.func,
};
