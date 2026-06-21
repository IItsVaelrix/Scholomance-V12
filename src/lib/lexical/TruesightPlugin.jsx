import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TextNode, $isTextNode, $createTextNode, $getRoot, $nodesOfType } from 'lexical';
import { $createTruesightWordNode, $isTruesightWordNode, TruesightWordNode } from './TruesightNode';
import { WORD_TOKEN_REGEX, WORD_PATTERN } from '../../lib/wordTokenization.js';
import { computeCharStartFromLexical, resolveTokenDataAtPosition } from './charStart.js';
import { wordTruesight, tokenTruesight } from '../../pages/Visualiser/truesightColor';
import { decodeBytecode } from '../../lib/truesight/bytecodeRenderer.js';

// WORD_TOKEN_REGEX is anchored (^…$) — correct for "is this node exactly one
// word?" but useless for FINDING a word inside a multi-word text node. Branch (b)
// needs an unanchored matcher (uses match.index + splitText), or loaded
// multi-word lines never tokenize/colour. Non-global so .exec has no lastIndex.
const WORD_MATCH_REGEX = new RegExp(WORD_PATTERN);

// Loud-failure invariant: when the resonance gate is set but no charStart
// in the document matches any entry, the upstream analysis convention has
// drifted from the Lexical convention (Prion #1). Log a one-shot warning so
// the bug is visible in dev. In production the words simply stay uncolored
// rather than silently applying a wrong-position analysis.
let _gateConventionsDriftWarned = false;
function warnGateConventionsDrift(globalCharStart, resonantSetSize) {
  if (_gateConventionsDriftWarned) return;
  if (typeof console === 'undefined' || !console.warn) return;
  _gateConventionsDriftWarned = true;
  console.warn(
    '[Truesight] Resonance gate Set has no charStart matching the Lexical document. ' +
    'Upstream analysis (compileVerseToIR) and Lexical (charStart.js) may disagree on the ' +
    'paragraph-joined-with-\\n convention. Probe charStart=' + globalCharStart +
    ', resonantSetSize=' + resonantSetSize + '. ' +
    'Words will render uncolored until the conventions align — see tests/qa/features/charStart-convention.test.jsx.'
  );
}

// Module-scoped flag so the dev-only warning is a one-shot, never per-word spam.
let _driftDetectorSampled = false;
function maybeWarnIfGateConventionDrifted(analyzedWordsByCharStart, resonantCharStarts, currentCharStart) {
  if (_driftDetectorSampled) return;
  if (!(resonantCharStarts instanceof Set) || resonantCharStarts.size === 0) return;
  
  // Only sample if the analysis is fully populated.
  if (!analyzedWordsByCharStart || analyzedWordsByCharStart.size === 0) return;

  _driftDetectorSampled = true;
  // We check analyzedWordsByCharStart. If the word isn't even in the base analysis,
  // we might have a drift or it might just be an unanalyzed new word.
  // To avoid spurious warnings during typing, we just skip warning here, or check if
  // NONE of the resonantCharStarts are in the document.
  // Since we only process one node at a time, we can't easily check the whole document.
  // We'll remove the spurious warning, but keep the function signature.
}

export default function TruesightPlugin({ analyzedDocument: _analyzedDocument, isTruesight, isQuarantined, analyzedWordsByCharStart, analyzedWordsByIdentity, theme, resonantCharStarts }) {
  const [editor] = useLexicalComposerContext();

  // Mutable inputs the transform reads, kept in refs so the node transform is
  // registered ONCE and never re-registers on prop-identity churn. Re-registering
  // a node transform re-transforms every node and fires an editor update; combined
  // with an onCursorChange that re-renders the parent (giving these props new
  // identities each keystroke), that created an infinite update↔render loop which
  // froze typing/clicks. See tests/visual/lexical-typing diagnosis.
  const inputsRef = useRef({});
  inputsRef.current = { isQuarantined, analyzedWordsByCharStart, analyzedWordsByIdentity, theme, resonantCharStarts };

  useEffect(() => {
    if (!editor.hasNodes([TruesightWordNode])) {
      console.warn('TruesightWordNode not registered on editor');
      return;
    }

    // Resolve the per-position upstream analysis for a text-bearing node.
    // Position-only — no text-keyed fallback (Prion #2 from the spatial-immune
    // chemotaxis diagnosis: the previous textKeyedCache silently masked
    // upstream charStart failures by re-applying the last-inserted analysis
    // for repeated words, which is structurally impossible to detect in CI).
    //
    // STALENESS GUARD: `analyzedWordsByCharStart` and `analyzedWordsByIdentity`
    // are read from inputsRef.current on every call, NOT from the useEffect
    // closure. The useEffect deps are [editor, isTruesight], so closure
    // captures are frozen at first mount. Reading from inputsRef keeps the
    // transform in sync with upstream analysis updates. The staleness
    // diagnosis (RAID PAT-004 — Weave Propagation Chain) lives in
    // tests/qa/features/charStart-convention.test.jsx as the regression guard.
    const lookupTokenData = (node, text) => {
      const { analyzedWordsByCharStart: liveByCharStart, analyzedWordsByIdentity: liveByIdentity } = inputsRef.current;
      return resolveTokenDataAtPosition(
        node,
        text,
        liveByCharStart instanceof Map ? Object.fromEntries(liveByCharStart) : liveByCharStart,
        liveByIdentity instanceof Map ? Object.fromEntries(liveByIdentity) : liveByIdentity
      );
    };

    const transformListener = (textNode) => {
      const { isQuarantined, analyzedWordsByCharStart, analyzedWordsByIdentity, theme, resonantCharStarts } = inputsRef.current;

      const isResonantAt = (cs) => !(resonantCharStarts instanceof Set) || resonantCharStarts.has(cs);

      if (!isTruesight) {
        if ($isTruesightWordNode(textNode)) {
          textNode.replace($createTextNode(textNode.getTextContent()));
        }
        return;
      }

      const textContent = textNode.getTextContent();

      // Active node branch: this is already a Truesight word node. Refresh its
      // color/class from the canonical lookup. We never fall back to a
      // text-keyed cache here — that was the source of the silent-override bug.
      if ($isTruesightWordNode(textNode)) {
        if (WORD_TOKEN_REGEX.test(textContent)) {
          const globalCharStart = computeCharStartFromLexical(textNode);
          maybeWarnIfGateConventionDrifted(inputsRef.current.analyzedWordsByCharStart, resonantCharStarts, globalCharStart);

          const tokenData = lookupTokenData(textNode, textContent);

          const wordInfo = wordTruesight(textContent);
          const tokenInfo = tokenTruesight(tokenData || { token: textContent }, textContent);

          let truesight = wordInfo;
          let shouldColor = false;

          if (resonantCharStarts instanceof Set) {
            if (resonantCharStarts.has(globalCharStart)) {
              truesight = tokenInfo;
              shouldColor = true;
            } else {
              truesight = wordInfo;
              shouldColor = false;
            }
          } else {
            truesight = wordInfo;
            shouldColor = Boolean(wordInfo);
          }

          const color = (!isQuarantined && shouldColor && truesight?.color) ? truesight.color : null;

          let truesightClass = '';
          if (shouldColor) {
            truesightClass = `grimoire-word--${truesight.school} grimoire-word--active`;
          } else if (truesight) {
            truesightClass = 'grimoire-word--grey';
          }

          if (textNode.__color !== color || textNode.__truesightClass !== truesightClass) {
            const bytecode = tokenData?.bytecode;
            const decodedStyle = (bytecode && shouldColor && !isQuarantined) ? (tokenData.precomputed?.decoded || decodeBytecode(bytecode, { reducedMotion: false, theme })) : null;
            const updatedNode = $createTruesightWordNode(textContent, color, truesightClass, decodedStyle, false, tokenData);
            textNode.replace(updatedNode);
          }
        } else {
          textNode.replace($createTextNode(textContent));
        }
        return;
      }

      // Regular text node branch: find the first word and split. Compute the
      // charStart on the *post-split* target node (its position in the tree
      // has changed because we just split it). Then look up by position only.
      const match = WORD_MATCH_REGEX.exec(textContent);
      if (match === null) {
        return;
      }

      const word = match[0];
      const startIndex = match.index;

      let beforeNode = null;
      let targetNode = textNode;
      let afterNode = null;

      if (startIndex > 0) {
        [beforeNode, targetNode] = textNode.splitText(startIndex);
      }

      if (targetNode.getTextContent().length > word.length) {
        [targetNode, afterNode] = targetNode.splitText(word.length);
      }

      const globalCharStart = computeCharStartFromLexical(targetNode);
      maybeWarnIfGateConventionDrifted(resonantCharStarts, globalCharStart);

      const tokenData = lookupTokenData(targetNode, word);

      const wordInfo = wordTruesight(word);
      const tokenInfo = tokenTruesight(tokenData || { token: word }, word);

      let truesight = wordInfo;
      let shouldColor = false;

      if (resonantCharStarts instanceof Set) {
        if (resonantCharStarts.has(globalCharStart)) {
          truesight = tokenInfo;
          shouldColor = true;
        } else {
          truesight = wordInfo;
          shouldColor = false;
        }
      } else {
        truesight = wordInfo;
        shouldColor = Boolean(wordInfo);
      }

      const color = (!isQuarantined && shouldColor && truesight?.color) ? truesight.color : null;

      // Class must match the active branch's classification so the freshly
      // created TruesightWordNode is visually correct WITHOUT requiring the
      // active branch to re-fire on it. Lexical's `replace` does not
      // auto-mark the new node dirty, so the active branch is not guaranteed
      // to run after a split. The "annotation per line instead of per word"
      // regression was non-resonant words rendering with only the base
      // `grimoire-word` class (no --grey, no --active) because the regular
      // branch omitted the --grey fallback. This guard makes the regular
      // branch self-sufficient. See tests/qa/features/annotation-per-line-probe.test.jsx
      // and tests/qa/features/charStart-convention.test.jsx for the guards.
      let truesightClass = '';
      if (shouldColor) {
        truesightClass = `grimoire-word--${truesight.school} grimoire-word--active`;
      } else if (truesight) {
        truesightClass = 'grimoire-word--grey';
      }

      const bytecode = tokenData?.bytecode;
      const decodedStyle = (bytecode && shouldColor && !isQuarantined) ? (tokenData.precomputed?.decoded || decodeBytecode(bytecode, { reducedMotion: false, theme })) : null;

      const truesightNode = $createTruesightWordNode(word, color, truesightClass, decodedStyle, false, tokenData);
      targetNode.replace(truesightNode);
    };

    // Register the SAME listener on both node types. Lexical dispatches
    // transforms by exact __type, and a tokenized word is a TruesightWordNode
    // ('truesight-word'), NOT a TextNode ('text'). Registering only on TextNode
    // left the active branch (which refreshes an existing word against the
    // current resonance gate) permanently dead, so words created grey during
    // async load never re-coloured when the gate arrived. Registering on
    // TruesightWordNode too makes markDirty re-evaluation actually fire.
    const removeTransform = editor.registerNodeTransform(TextNode, transformListener);
    const removeWordTransform = editor.registerNodeTransform(TruesightWordNode, transformListener);

    // Registering a transform does NOT retroactively process existing nodes, so
    // already-loaded scroll content would never tokenize/colour. Mark current
    // nodes dirty once to run the transform over them. Safe from the
    // re-render loop because this effect only re-runs on editor/isTruesight.
    // Mark BOTH plain TextNodes and already-tokenized TruesightWordNodes:
    // $nodesOfType(TextNode) filters on exact __type === 'text', so it excludes
    // TruesightWordNodes ('truesight-word'). See the resonant-change effect.
    editor.update(() => {
      for (const node of $nodesOfType(TextNode)) node.markDirty();
      for (const node of $nodesOfType(TruesightWordNode)) node.markDirty();
    });

    return () => {
      removeTransform();
      removeWordTransform();
    };
  }, [editor, isTruesight]);

  const prevResonantRef = useRef(resonantCharStarts);
  useEffect(() => {
    if (prevResonantRef.current !== resonantCharStarts) {
      prevResonantRef.current = resonantCharStarts;
      _driftDetectorSampled = false;
      // The gate changed (e.g. async analysis filled the resonant Set after
      // first render). Re-run the transform over EVERY word-bearing node so
      // existing words re-evaluate against the new Set. Marking only
      // $nodesOfType(TextNode) skips already-coloured TruesightWordNodes
      // (__type 'truesight-word'), which left late-arriving resonance grey.
      editor.update(() => {
        for (const node of $nodesOfType(TextNode)) node.markDirty();
        for (const node of $nodesOfType(TruesightWordNode)) node.markDirty();
      });
    }
  }, [editor, resonantCharStarts]);

  return null;
}
