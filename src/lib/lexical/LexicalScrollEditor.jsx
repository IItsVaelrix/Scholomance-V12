import React, { useMemo, useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode, $getNodeByKey, $getSelection, COMMAND_PRIORITY_LOW, CLICK_COMMAND, KEY_MODIFIER_COMMAND, COMMAND_PRIORITY_NORMAL, $isParagraphNode, $isTextNode, $createRangeSelection, $setSelection } from 'lexical';
import { motion, AnimatePresence } from "framer-motion";

import { TruesightWordNode, $isTruesightWordNode } from './TruesightNode';
import TruesightPlugin from './TruesightPlugin';
import CursorAndIntelliSensePlugin from './CursorAndIntelliSensePlugin';
import Gutter from "../../pages/Read/Gutter.jsx";
import IntelliSense from '../../components/IntelliSense.jsx';
import { evaluateSCD64CircuitBreaker } from '../../core/scd64/circuitBreaker';

const lexicalTheme = {
  paragraph: 'editor-paragraph',
  text: {
    bold: 'editor-text-bold',
    italic: 'editor-text-italic',
  },
};

// Each scroll line is its own paragraph, but Lexical's root.getTextContent()
// joins top-level blocks with '\n\n' — which doubled newlines on every save/change.
// Join blocks with a single '\n' so the round-tripped content matches the source.
// Must be called within a Lexical read/update context.
function $getScrollText() {
  return $getRoot().getChildren().map((child) => child.getTextContent()).join('\n');
}

function ExternalContentSyncPlugin({ content }) {
  const [editor] = useLexicalComposerContext();
  const [isTyping, setIsTyping] = useState(false);

  // We don't want to reset cursor when the user is actively typing.
  // We only want to update Lexical if the parent forced a programmatic change (e.g., loading a scroll).
  useEffect(() => {
    if (content === undefined || content === null) return;
    
    editor.getEditorState().read(() => {
      const currentText = $getScrollText();
      if (currentText !== content) {
        editor.update(() => {
          const root = $getRoot();
          root.clear();
          const lines = content.split('\n');
          lines.forEach(line => {
             const paragraph = $createParagraphNode();
             paragraph.append($createTextNode(line));
             root.append(paragraph);
          });
        });
      }
    });
  }, [editor, content]);

  return null;
}

function SpellcheckPlugin({ checkSpelling }) {
  const [editor] = useLexicalComposerContext();
  const spellCache = useRef(new Map());

  useEffect(() => {
    if (!checkSpelling) return;

    const performSpellcheck = async () => {
      let wordsToCheck = new Set();
      
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const traverse = (node) => {
          if ($isTruesightWordNode(node)) {
            const word = node.getTextContent().toLowerCase().replace(/[^a-z0-9]/g, '');
            if (word && !spellCache.current.has(word)) wordsToCheck.add(word);
          } else if (node.getChildren) {
            node.getChildren().forEach(traverse);
          }
        };
        traverse(root);
      });

      if (wordsToCheck.size === 0) return;

      const results = await Promise.all(
        Array.from(wordsToCheck).map(async word => {
          try {
            const isValid = await checkSpelling(word);
            return { word, isValid };
          } catch {
            return { word, isValid: true };
          }
        })
      );

      results.forEach(({ word, isValid }) => {
        spellCache.current.set(word, isValid);
      });

      editor.update(() => {
        const root = $getRoot();
        const traverseUpdate = (node) => {
          if ($isTruesightWordNode(node)) {
            const word = node.getTextContent().toLowerCase().replace(/[^a-z0-9]/g, '');
            const isValid = spellCache.current.get(word);
            if (isValid === false && !node.__isMisspelled) {
              node.setMisspelled(true);
            } else if (isValid === true && node.__isMisspelled) {
              node.setMisspelled(false);
            }
          } else if (node.getChildren) {
            node.getChildren().forEach(traverseUpdate);
          }
        };
        traverseUpdate(root);
      });
    };

    const unregister = editor.registerUpdateListener(({ tags }) => {
       if (!tags.has('spellcheck-update')) {
          performSpellcheck();
       }
    });
    
    performSpellcheck();

    return unregister;
  }, [editor, checkSpelling]);

  return null;
}

function LineDecorationPlugin({ highlightedLines, pinnedLines }) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    const applyClasses = () => {
      editor.getEditorState().read(() => {
         const root = $getRoot();
         let currentLine = 1;
         root.getChildren().forEach((node) => {
           if ($isParagraphNode(node)) {
              const dom = editor.getElementByKey(node.getKey());
              if (dom) {
                 if (highlightedLines?.includes(currentLine)) dom.classList.add('rhyme-highlight');
                 else dom.classList.remove('rhyme-highlight');
                 
                 if (pinnedLines?.includes(currentLine)) dom.classList.add('pinned-ghost-line');
                 else dom.classList.remove('pinned-ghost-line');
              }
              currentLine++;
           }
         });
      });
    };
    
    applyClasses();
    return editor.registerUpdateListener(() => applyClasses());
  }, [editor, highlightedLines, pinnedLines]);

  return null;
}

// Lexical reads `editable` from initialConfig only once at mount. Without this,
// a scroll that loads read-only stays frozen non-editable and typing silently
// fails even after the parent flips to edit mode.
function EditablePlugin({ isEditable }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.setEditable(!!isEditable);
  }, [editor, isEditable]);
  return null;
}

function SavePlugin({ onSave, title }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (!onSave) return;
    return editor.registerCommand(
      KEY_MODIFIER_COMMAND,
      (event) => {
        if (event.ctrlKey && event.key === 's') {
          event.preventDefault();
          editor.getEditorState().read(() => {
            const content = $getScrollText();
            onSave(title, content);
          });
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_NORMAL
    );
  }, [editor, onSave, title]);
  return null;
}

function LexicalRefPlugin({ editorRef }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editorRef) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);
  return null;
}

function WordClickPlugin({ onWordActivate, analyzedDocument }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!onWordActivate) return;

    return editor.registerCommand(
      CLICK_COMMAND,
      (event) => {
        const target = event.target;
        if (target && target.dataset.lexicalKey) {
          editor.getEditorState().read(() => {
            const node = $getNodeByKey(target.dataset.lexicalKey);
            if ($isTruesightWordNode(node)) {
              const tokenData = node.getTokenData();
              const analysis = analyzedDocument?.syntaxSummary?.tokens?.find(t => t.token === node.getTextContent()) || null;
              
              onWordActivate({
                word: node.getTextContent(),
                normalizedWord: node.getTextContent().toLowerCase().replace(/[^a-z0-9]/g, ''),
                trigger: 'truesight_tap',
                analysis: analysis,
                charStart: tokenData?.charStart,
                charEnd: tokenData?.charEnd,
                lineIndex: tokenData?.lineNumber,
                wordIndex: tokenData?.wordIndex,
                vowelFamily: analysis?.vowelFamily,
                terminalVowelFamily: analysis?.rhymeFamily,
                school: node.__truesightClass ? node.__truesightClass.replace('grimoire-word--', '').replace(' grimoire-word--active', '') : null,
                color: node.__color,
                isMisspelled: node.__isMisspelled,
                anchorRect: target.getBoundingClientRect(),
              });
            }
          });
          return true; // Stop propagation
        }
        return false;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor, onWordActivate, analyzedDocument]);

  return null;
}

const LexicalScrollEditor = forwardRef(({
  content,
  onContentChange,
  isEditable = true,
  isTruesight = false,
  analyzedDocument = null,
  onWordActivate,
  isPredictive = false,
  getCompletions = null,
  predictorReady = false,
  syntaxLayer = null,
  onSave,
  title,
  onCursorChange,
  isLatticeGrid = false,
  mirrored = false,
  checkSpelling,
  getSpellingSuggestions,
  onTitleChange,
  analyzedWordsByCharStart,
  analyzedWordsByIdentity,
  highlightedLines,
  pinnedLines,
  theme,
  onFocus,
  onBlur,
  lineSyllableCounts = null,
  resonantCharStarts = null,
}, ref) => {
  const editorContainerRef = useRef(null);
  const lexicalEditorRef = useRef(null);
  const [cursorCoords, setCursorCoords] = useState({ x: 0, y: 0, lineIndex: 0, colIndex: 0 });
  const [intellisenseSuggestions, setIntellisenseSuggestions] = useState([]);
  const [intellisenseIndex, setIntellisenseIndex] = useState(0);
  const [currentPrefix, setCurrentPrefix] = useState('');
  
  // Expose the API Bridge expected by ReadPage.jsx
  useImperativeHandle(ref, () => ({
    save: () => {
      if (lexicalEditorRef.current && onSave) {
        lexicalEditorRef.current.getEditorState().read(() => {
          onSave(title, $getScrollText());
        });
      }
    },
    jumpToLine: (lineNum) => {
      if (lexicalEditorRef.current) {
        lexicalEditorRef.current.update(() => {
          const root = $getRoot();
          let currentLine = 1;
          let targetNode = null;
          let targetOffset = 0;

          const pNodes = root.getChildren();
          for (let p of pNodes) {
            if ($isParagraphNode(p)) {
               if (currentLine === lineNum) {
                 targetNode = p;
                 targetOffset = 0;
                 break;
               }
               
               const children = p.getChildren();
               for (let child of children) {
                 if ($isTextNode(child)) {
                   const t = child.getTextContent();
                   for (let i = 0; i < t.length; i++) {
                     if (currentLine === lineNum) {
                       targetNode = child;
                       targetOffset = i;
                       break;
                     }
                     if (t[i] === '\n') currentLine++;
                   }
                   if (targetNode) break;
                 } else if (child.getType() === 'linebreak') {
                   currentLine++;
                   if (currentLine === lineNum) {
                     targetNode = child.getNextSibling() || p;
                     targetOffset = child.getNextSibling() ? 0 : p.getChildrenSize();
                     break;
                   }
                 }
               }
               if (targetNode) break;
               currentLine++; // Paragraph boundary
            }
          }

          if (targetNode) {
             const selection = $createRangeSelection();
             selection.anchor.set(targetNode.getKey(), targetOffset, $isTextNode(targetNode) ? 'text' : 'element');
             selection.focus.set(targetNode.getKey(), targetOffset, $isTextNode(targetNode) ? 'text' : 'element');
             $setSelection(selection);
             
             setTimeout(() => {
                const domNode = lexicalEditorRef.current.getElementByKey(targetNode.getKey());
                if (domNode && domNode.scrollIntoView) {
                    domNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
             }, 10);
          }
        });
      }
    },
    scrollTo: (options) => {
      editorContainerRef.current?.scrollTo(options);
    },
    scrollToTopSmooth: () => {
      editorContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    replaceContent: (newContent) => {
      if (lexicalEditorRef.current) {
        lexicalEditorRef.current.update(() => {
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          paragraph.append($createTextNode(newContent));
          root.append(paragraph);
        });
        if (onContentChange) onContentChange(newContent);
      }
    },
    get clientHeight() { 
      return editorContainerRef.current?.clientHeight || 0; 
    },
    get scrollHeight() { 
      return editorContainerRef.current?.scrollHeight || 0; 
    },
  }));

  const initialConfig = {
    namespace: 'ScholomanceLexical',
    theme: lexicalTheme,
    onError: (error) => console.error(error),
    editable: isEditable,
    nodes: [TruesightWordNode],
  };

  const handleChange = (editorState, editor) => {
    editorState.read(() => {
      const text = $getScrollText();
      if (onContentChange) onContentChange(text);
    });
  };

  const handlePrefixChange = useCallback(async (prefix, textBeforeCursor) => {
    setCurrentPrefix(prefix);
    if (prefix.length === 0) {
      setIntellisenseSuggestions([]);
      return;
    }
    const lines = textBeforeCursor.split("\n");
    const lineIndex = lines.length - 1;

    let suggestionsList = [];

    // Spelling corrections first — independent of the predictor, so they surface
    // even when predictive completion is off or not yet ready.
    if (checkSpelling && getSpellingSuggestions) {
      try {
        const valid = await checkSpelling(prefix);
        if (!valid) {
          const corrections = await getSpellingSuggestions(prefix, null, 3);
          if (corrections && corrections.length) {
            suggestionsList = corrections.map((word) => ({
              token: word, type: 'correction', isRhyme: false, badges: ['spelling'],
            }));
          }
        }
      } catch { /* spelling is best-effort */ }
    }

    // Predictive completions appended (deduped against corrections).
    if (isPredictive && getCompletions && predictorReady) {
      const completions = await getCompletions(prefix, lineIndex, syntaxLayer);
      if (completions && completions.length) {
        const seen = new Set(suggestionsList.map((s) => s.token));
        for (const c of completions) {
          if (!seen.has(c.token)) suggestionsList.push(c);
        }
      }
    }

    if (suggestionsList.length === 0) {
      setIntellisenseSuggestions([]);
      return;
    }
    setIntellisenseSuggestions(suggestionsList);
    setIntellisenseIndex(0);
  }, [isPredictive, getCompletions, predictorReady, syntaxLayer, checkSpelling, getSpellingSuggestions]);

  const handleAcceptSuggestion = useCallback((token) => {
    if (lexicalEditorRef.current && currentPrefix) {
       lexicalEditorRef.current.update(() => {
          const selection = $getSelection();
          if (selection && selection.isCollapsed()) {
             for (let i = 0; i < currentPrefix.length; i++) {
                selection.deleteBackward();
             }
             selection.insertText(token);
          }
       });
    }
    setIntellisenseSuggestions([]);
  }, [currentPrefix]);

  const activeIdeMode = isTruesight ? "TRUESIGHT" : (isEditable ? "EDIT" : "NEUTRAL");
  const lines = (content || "").split('\n');
  const totalLines = lines.length;

  const syllablesPerLine = useMemo(() => {
    // Prefer the authoritative per-line counts ReadPage already computes
    // (deepAnalysis.lineSyllableCounts); only fall back to a local estimate
    // when they are absent.
    if (Array.isArray(lineSyllableCounts) && lineSyllableCounts.length > 0) {
      return lines.map((_, i) => lineSyllableCounts[i] ?? 0);
    }
    return lines.map(line => {
      let count = 0;
      const words = line.match(/[a-zA-Z']+/g) || [];
      words.forEach(word => {
        const t = analyzedDocument?.syntaxSummary?.tokens?.find(t => t.token.toLowerCase() === word.toLowerCase());
        count += t?.syllableCount || 0;
      });
      return count;
    });
  }, [content, analyzedDocument, lineSyllableCounts]);

  const isQuarantined = useMemo(() => {
    if (!analyzedDocument?.scd64Full) return false;
    const { checksum64, bugFamily } = analyzedDocument.scd64Full;
    const breaker = evaluateSCD64CircuitBreaker({
      checksum64,
      bugFamily,
      severity: "FATAL_PRESENTATION_DESYNC" // Assumed high severity if it reached SCD64 emission
    });
    return breaker.active;
  }, [analyzedDocument]);

  const handleSave = () => {
    if (lexicalEditorRef.current && onSave) {
      lexicalEditorRef.current.getEditorState().read(() => {
        onSave(title, $getScrollText());
      });
    }
  };

  return (
    <div
      className="lexical-scroll-editor-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
      onFocus={(e) => onFocus?.(e)}
      onBlur={(e) => {
        if (!editorContainerRef.current?.contains(e.relatedTarget)) onBlur?.(e);
      }}
    >
      <div className="editor-header">
        {isEditable ? (
          <div className="editor-title-container">
            <input
              id="scroll-title"
              type="text"
              className="editor-title-input"
              placeholder="Scroll Title..."
              aria-label="Scroll Title"
              value={title || ''}
              onChange={(e) => {
                if (onTitleChange) onTitleChange(e.target.value);
              }}
              maxLength={100}
              aria-required="true"
            />
            <button
              type="button"
              className="btn btn-primary save-scroll-btn"
              onClick={handleSave}
              disabled={!content?.trim()}
            >
              Save Scroll
            </button>
            <button
              type="button"
              className="scroll-top-btn"
              onClick={() => editorContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              aria-label="Scroll to top"
              title="Scroll to top"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 9.5L7 4.5L12 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        ) : (
          <h2 className="editor-title-display">{title || "Untitled Scroll"}</h2>
        )}
      </div>

      <motion.div
        className={`editor-body ${isEditable ? 'editable' : 'read-only'} ${isTruesight && !isEditable ? 'read-only-truesight' : ''} ${isLatticeGrid ? 'lattice-grid' : ''} ${mirrored ? 'mirrored' : ''}`}
        style={{ position: 'relative', flex: 1, minHeight: 0 }}
      >
        <div className="editor-textarea-wrapper" style={{ display: 'flex', flexDirection: 'row', height: '100%', minHeight: 0 }}>
        <Gutter
          totalLines={totalLines}
          currentLine={cursorCoords.lineIndex + 1 || 1}
          syllablesPerLine={syllablesPerLine}
          activeIdeMode={activeIdeMode}
          lineHeightPx={32}
        />
        <div ref={editorContainerRef} className="editor-textarea-wrapper" style={{ flex: 1, position: 'relative', minWidth: 0 }}>
          <div className={`lexical-wrapper ${isTruesight ? 'truesight-active' : ''}`} style={{ width: '100%', height: '100%', position: 'relative' }}>
            <LexicalComposer initialConfig={initialConfig}>
              <EditablePlugin isEditable={isEditable} />
              <ExternalContentSyncPlugin content={content} />
              <PlainTextPlugin
                contentEditable={<ContentEditable className="editor-textarea lexical-content-editable" style={{ minHeight: '100%', outline: 'none', whiteSpace: 'pre-wrap', position: 'relative', zIndex: 10 }} />}
                placeholder={<div className="editor-placeholder">Inscribe thy verses...</div>}
              />
              <SavePlugin onSave={onSave} title={title} />
              <LexicalRefPlugin editorRef={lexicalEditorRef} />
              <SpellcheckPlugin checkSpelling={checkSpelling} />
              <LineDecorationPlugin highlightedLines={highlightedLines} pinnedLines={pinnedLines} />
              <TruesightPlugin analyzedDocument={analyzedDocument} isTruesight={isTruesight} isQuarantined={isQuarantined} analyzedWordsByCharStart={analyzedWordsByCharStart} analyzedWordsByIdentity={analyzedWordsByIdentity} theme={theme} resonantCharStarts={resonantCharStarts} />
              <WordClickPlugin onWordActivate={onWordActivate} analyzedDocument={analyzedDocument} />
              
              <CursorAndIntelliSensePlugin 
                onCursorPositionChange={setCursorCoords}
                onCursorChange={onCursorChange}
                onPrefixChange={handlePrefixChange}
                suggestionsActive={intellisenseSuggestions.length > 0}
                onSuggestionNavigate={(dir) => {
                  setIntellisenseIndex(i => (i + dir + intellisenseSuggestions.length) % intellisenseSuggestions.length);
                }}
                onSuggestionAccept={() => {
                  if (intellisenseSuggestions[intellisenseIndex]) {
                    handleAcceptSuggestion(intellisenseSuggestions[intellisenseIndex].token);
                  }
                }}
                onSuggestionCancel={() => setIntellisenseSuggestions([])}
              />

              <OnChangePlugin onChange={handleChange} />
              <HistoryPlugin />
            </LexicalComposer>

            <AnimatePresence>
              {intellisenseSuggestions.length > 0 && (
                <IntelliSense
                  suggestions={intellisenseSuggestions}
                  selectedIndex={intellisenseIndex}
                  position={cursorCoords}
                  onAccept={handleAcceptSuggestion}
                  onHover={setIntellisenseIndex}
                  ghostLine={intellisenseSuggestions[intellisenseIndex]?.ghostLine || null}
                  badges={intellisenseSuggestions[intellisenseIndex]?.badges || []}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
      </motion.div>
    </div>
  );
});

export default LexicalScrollEditor;
