import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $isTextNode } from 'lexical';
import { $isTruesightWordNode } from './TruesightNode';

function extractWordAtOffset(text, offset) {
  if (!text || offset < 0 || offset >= text.length) return null;
  const wordPattern = /[a-zA-Z']+/;
  if (!wordPattern.test(text[offset])) return null;

  let start = offset;
  let end = offset;
  while (start > 0 && wordPattern.test(text[start - 1])) start--;
  while (end < text.length - 1 && wordPattern.test(text[end + 1])) end++;
  end++;

  const word = text.slice(start, end);
  return word ? { word, column: start } : null;
}

export default function RitualPredictionPlugin({ onRitualPredictionRequest }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!onRitualPredictionRequest) return;

    const handleContextMenu = (event) => {
      const target = event.target;
      if (!target) return;

      const lexicalKey = target.dataset?.lexicalKey;
      if (!lexicalKey) return;

      editor.getEditorState().read(() => {
        const node = $getNodeByKey(lexicalKey);
        if (!node) return;

        let word = null;
        let lineText = '';

        if ($isTruesightWordNode(node)) {
          word = node.getTextContent();
          const parent = node.getParent();
          if (parent) lineText = parent.getTextContent();
        } else if ($isTextNode(node)) {
          const text = node.getTextContent();
          const selection = window.getSelection();
          let offset = 0;
          if (selection && selection.anchorNode) {
            const range = document.createRange();
            range.selectNodeContents(target);
            const rect = range.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const charWidth = rect.width / text.length;
            offset = Math.min(Math.floor(clickX / charWidth), text.length - 1);
          }
          const extracted = extractWordAtOffset(text, Math.max(0, offset));
          if (extracted) {
            word = extracted.word;
            lineText = text;
          }
        }

        if (!word || !word.trim()) return;

        event.preventDefault();

        const rect = target.getBoundingClientRect();
        onRitualPredictionRequest({
          word,
          contextLine: lineText,
          anchorRect: {
            x: event.clientX,
            y: event.clientY,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            bottom: rect.bottom,
            right: rect.right,
          },
        });
      });
    };

    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    editorElement.addEventListener('contextmenu', handleContextMenu);
    return () => {
      editorElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor, onRitualPredictionRequest]);

  return null;
}
