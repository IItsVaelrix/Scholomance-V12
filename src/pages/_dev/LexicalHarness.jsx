/**
 * DEV-ONLY harness for the Lexical editor typing diagnosis.
 * Mirrors ReadPage's controlled-content wiring: when editable, the `content`
 * prop is derived from the live `editorContent` state that `onContentChange`
 * updates - so this reproduces the per-keystroke content-prop feedback loop.
 */
import React, { useState, useCallback, useEffect } from 'react';
import LexicalScrollEditor from '../../lib/lexical/LexicalScrollEditor.jsx';

export default function LexicalHarness() {
  const initialContent = new URLSearchParams(window.location.search).get('single') === '1'
    ? 'Hello.'
    : 'Alpha beta gamma\nSecond line here';
  const [editorContent, setEditorContent] = useState(initialContent);
  const [changeCount, setChangeCount] = useState(0);
  const isEditable = true;
  const isTruesight = new URLSearchParams(window.location.search).get('truesight') === '1';

  const handleChange = useCallback((c) => {
    setEditorContent(c);
    setChangeCount((n) => n + 1);
  }, []);

  const qp = new URLSearchParams(window.location.search);
  const full = qp.get('full') === '1';
  const flag = (k) => full || qp.get(k) === '1';
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  // Stub plugins that run editor.update on every keystroke (the caret suspects).
  const checkSpelling = useCallback(async (w) => w.length <= 4, []); // long words "misspelled"
  const getSpellingSuggestions = useCallback(async () => ['correctme', 'corrected', 'correctly'], []);
  const analyzedDocument = { syntaxSummary: { tokens: [{ token: 'beta', syllableCount: 2 }] } };

  // Faithful to ReadPage line 270-271.
  const editorInitialContent = isEditable ? String(editorContent || '') : editorContent;

  useEffect(() => {
    window.__HARNESS__ = { editorContent, changeCount };
    document.body.setAttribute('data-lexical-ready', 'true');
  }, [editorContent, changeCount]);

  return (
    <div className="ide-layout-wrapper" data-lexical-harness style={{ height: '100vh', background: '#040409' }}>
      <div className="editor-body editable" style={{ width: 820, height: 640, margin: '0 auto', position: 'relative' }}>
        <LexicalScrollEditor
          content={editorInitialContent}
          onContentChange={handleChange}
          isEditable={isEditable}
          isTruesight={isTruesight}
          title="Harness"
          lineSyllableCounts={[2, 3]}
          {...(flag('spell') ? { checkSpelling, getSpellingSuggestions } : {})}
          {...(flag('analysis') ? { analyzedDocument } : {})}
          {...(flag('cursor') ? { onCursorChange: setCursor } : {})}
          {...(flag('highlight') ? { highlightedLines: [1] } : {})}
          {...(qp.get('resonant') === '1' ? { resonantCharStarts: new Set([0, 11]) } : {})}
        />
      </div>
    </div>
  );
}
