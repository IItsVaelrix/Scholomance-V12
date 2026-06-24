import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND, KEY_ARROW_DOWN_COMMAND, KEY_ARROW_UP_COMMAND, KEY_TAB_COMMAND, KEY_ENTER_COMMAND, KEY_ESCAPE_COMMAND } from 'lexical';

/**
 * Reconstruct the document text from the start up to the cursor by walking up
 * from the anchor node, prepending each previous sibling's text. A paragraph
 * sibling contributes a single '\n' line boundary (line 48 below). The cursor's
 * line is then `text.split('\n').length - 1`.
 *
 * Pure (only uses the Lexical node read API: getKey/getType/getTextContent/
 * getPreviousSibling/getParent) so it is unit-testable with plain fake nodes.
 *
 * @param {object} anchorNode - the selection anchor node
 * @param {string} localTextBeforeCursor - text within the anchor before the cursor
 * @returns {string}
 */
export function buildTextBeforeCursor(anchorNode, localTextBeforeCursor) {
  let fullTextBeforeCursor = localTextBeforeCursor;
  let curr = anchorNode;
  while (curr !== null && curr.getKey() !== 'root') {
    let prev = curr.getPreviousSibling();
    while (prev !== null) {
      fullTextBeforeCursor = prev.getTextContent() + (prev.getType() === 'paragraph' ? '\n' : '') + fullTextBeforeCursor;
      prev = prev.getPreviousSibling();
    }
    curr = curr.getParent();
  }
  return fullTextBeforeCursor;
}

export default function CursorAndIntelliSensePlugin({
  onCursorPositionChange,
  onCursorChange,
  onPrefixChange,
  suggestionsActive,
  onSuggestionNavigate,
  onSuggestionAccept,
  onSuggestionCancel
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          if (suggestionsActive) onSuggestionCancel();
          return;
        }

        const anchorNode = selection.anchor.getNode();
        const anchorOffset = selection.anchor.offset;
        
        let localTextBeforeCursor = '';
        if (selection.anchor.type === 'text') {
          localTextBeforeCursor = anchorNode.getTextContent().substring(0, anchorOffset);
        } else {
          const children = anchorNode.getChildren ? anchorNode.getChildren() : [];
          for (let i = 0; i < anchorOffset; i++) {
             if (children[i]) localTextBeforeCursor += children[i].getTextContent();
          }
        }
        
        // Extract the current typing prefix from the local text
        const lastWordMatch = localTextBeforeCursor.match(/([a-zA-Z']+)$/);
        const prefix = lastWordMatch ? lastWordMatch[1] : '';

        // Compute global line and col
        const fullTextBeforeCursor = buildTextBeforeCursor(anchorNode, localTextBeforeCursor);

        const lines = fullTextBeforeCursor.split('\n');
        const lineIndex = lines.length - 1;
        const col = lines[lineIndex].length;

        if (onCursorChange) {
          onCursorChange({ line: lineIndex + 1, col: col + 1 });
        }

        // Get coordinates directly from the DOM Range
        const domSelection = window.getSelection();
        if (domSelection && domSelection.rangeCount > 0) {
          const domRange = domSelection.getRangeAt(0);
          const rect = domRange.getBoundingClientRect();
          const editorContainer = editor.getRootElement()?.parentElement;
          const containerRect = editorContainer?.getBoundingClientRect() || { left: 0, top: 0 };
          
          if (onCursorPositionChange) {
            onCursorPositionChange({
              x: rect.left - containerRect.left,
              y: rect.bottom - containerRect.top + 4,
              lineIndex,
              colIndex: col,
            });
          }
        }

        if (onPrefixChange) {
          onPrefixChange(prefix, fullTextBeforeCursor);
        }
      });
    });
  }, [editor, onCursorPositionChange, onCursorChange, onPrefixChange, suggestionsActive, onSuggestionCancel]);

  // Intercept keyboard events if IntelliSense dropdown is active
  useEffect(() => {
    if (!suggestionsActive) return;

    const unregisterArrowDown = editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      (e) => { e.preventDefault(); onSuggestionNavigate(1); return true; },
      COMMAND_PRIORITY_HIGH
    );
    
    const unregisterArrowUp = editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      (e) => { e.preventDefault(); onSuggestionNavigate(-1); return true; },
      COMMAND_PRIORITY_HIGH
    );

    const unregisterTab = editor.registerCommand(
      KEY_TAB_COMMAND,
      (e) => { e.preventDefault(); onSuggestionAccept(); return true; },
      COMMAND_PRIORITY_HIGH
    );

    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (e) => { e.preventDefault(); onSuggestionAccept(); return true; },
      COMMAND_PRIORITY_HIGH
    );

    const unregisterEscape = editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (e) => { e.preventDefault(); onSuggestionCancel(); return true; },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      unregisterArrowDown();
      unregisterArrowUp();
      unregisterTab();
      unregisterEnter();
      unregisterEscape();
    };
  }, [editor, suggestionsActive, onSuggestionNavigate, onSuggestionAccept, onSuggestionCancel]);

  return null;
}
