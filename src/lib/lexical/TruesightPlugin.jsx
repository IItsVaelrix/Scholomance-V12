import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { TextNode, $isTextNode, $createTextNode, $getRoot, $nodesOfType } from 'lexical';
import { $createTruesightWordNode, $isTruesightWordNode, TruesightWordNode } from './TruesightNode';
import { WORD_TOKEN_REGEX, WORD_PATTERN } from '../../lib/wordTokenization.js';
import { computeCharStartFromLexical, resolveTokenDataAtPosition } from './charStart.js';
import { wordTruesight, tokenTruesight } from '../../pages/Visualiser/truesightColor';
import { decodeBytecode } from '../../lib/truesight/bytecodeRenderer.js';

// WORD_TOKEN_REGEX is anchored (^...$) - correct for "is this node exactly one
// word?" but useless for FINDING a word inside a multi-word text node. Branch (b)
// needs an unanchored matcher (uses match.index + splitText), or loaded
// multi-word lines never tokenize/colour.
//
// GLOBAL, because branch (b) must find EVERY word in the node in one pass.
// Splitting one word per transform cycle cost one Lexical cycle per word, and
// Lexical aborts at 100 — which capped Truesight at exactly 100 words. Built
// fresh here rather than shared: a global regex carries lastIndex, and a shared
// one would skip words between calls.
const WORD_MATCH_REGEX_GLOBAL = new RegExp(WORD_PATTERN, 'g');

// The tiered resonance gate is a Map<charStart, 'rhyme' | 'assonance'>.
// 'rhyme' = full school color + glow (the historical active tier).
// 'assonance' = soft school tint, no glow (the quiet vowel-echo tier).
// Build the per-word class for a resolved tier.
function tierColorClass(school, tier) {
  const tierClass = tier === 'assonance' ? 'grimoire-word--assonant' : 'grimoire-word--active';
  return `grimoire-word--${school} ${tierClass}`;
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
    // Position-only - no text-keyed fallback (Prion #2 from the spatial-immune
    // chemotaxis diagnosis: the previous textKeyedCache silently masked
    // upstream charStart failures by re-applying the last-inserted analysis
    // for repeated words, which is structurally impossible to detect in CI).
    //
    // STALENESS GUARD: `analyzedWordsByCharStart` and `analyzedWordsByIdentity`
    // are read from inputsRef.current on every call, NOT from the useEffect
    // closure. The useEffect deps are [editor, isTruesight], so closure
    // captures are frozen at first mount. Reading from inputsRef keeps the
    // transform in sync with upstream analysis updates. The staleness
    // diagnosis (RAID PAT-004 - Weave Propagation Chain) lives in
    // tests/qa/features/charStart-convention.test.jsx as the regression guard.
    const lookupTokenData = (node, text) => {
      const { analyzedWordsByCharStart: liveByCharStart, analyzedWordsByIdentity: liveByIdentity } = inputsRef.current;
      // Pass the live Maps straight through. resolveTokenDataAtPosition reads
      // them via .get(), so we no longer rebuild the entire map into an object
      // (Object.fromEntries) on every single word lookup -- that was O(N) per
      // word and O(N²) across a full recolor when the gate arrives.
      return resolveTokenDataAtPosition(node, text, liveByCharStart, liveByIdentity);
    };

    const transformListener = (textNode) => {
      const { isQuarantined, analyzedWordsByCharStart, analyzedWordsByIdentity, theme, resonantCharStarts } = inputsRef.current;

      if (!isTruesight) {
        if ($isTruesightWordNode(textNode)) {
          textNode.replace($createTextNode(textNode.getTextContent()));
        }
        return;
      }

      const textContent = textNode.getTextContent();

      // Active node branch: this is already a Truesight word node. Refresh its
      // color/class from the canonical lookup. We never fall back to a
      // text-keyed cache here - that was the source of the silent-override bug.
      if ($isTruesightWordNode(textNode)) {
        if (WORD_TOKEN_REGEX.test(textContent)) {
          const globalCharStart = computeCharStartFromLexical(textNode);

          const tokenData = lookupTokenData(textNode, textContent);

          const isGated = resonantCharStarts instanceof Map;
          const tier = isGated ? (resonantCharStarts.get(globalCharStart) || null) : 'rhyme';

          // Compute only the analysis we actually use. wordTruesight and
          // tokenTruesight each run a G2P pass; the previous code ran BOTH per
          // word and discarded one. Gated+resonant uses the token analysis;
          // every other case uses the word analysis.
          let truesight;
          let shouldColor;
          if (isGated) {
            shouldColor = tier !== null;
            truesight = shouldColor ? tokenTruesight(tokenData || { token: textContent }, textContent) : wordTruesight(textContent);
          } else {
            truesight = wordTruesight(textContent);
            shouldColor = Boolean(truesight);
          }

          const color = (!isQuarantined && shouldColor && truesight?.color) ? truesight.color : null;

          let truesightClass = '';
          if (shouldColor) {
            truesightClass = tierColorClass(truesight.school, tier);
          } else if (truesight) {
            truesightClass = 'grimoire-word--grey';
          }

          if (textNode.__color !== color || textNode.__truesightClass !== truesightClass) {
            const bytecode = tokenData?.bytecode;
            // The animated glow (decoded bytecode style) is the rhyme tier's
            // signal; the assonance tier shows only the soft school tint.
            const decodedStyle = (bytecode && shouldColor && tier !== 'assonance' && !isQuarantined) ? (tokenData.precomputed?.decoded || decodeBytecode(bytecode, { reducedMotion: false, theme })) : null;
            const updatedNode = $createTruesightWordNode(textContent, color, truesightClass, decodedStyle, false, tokenData);
            textNode.replace(updatedNode);
          }
        } else {
          textNode.replace($createTextNode(textContent));
        }
        return;
      }

      // Regular text node branch: tokenize EVERY word in this node in ONE pass.
      //
      // This used to split off only the FIRST word and return, leaving the rest
      // of the line as a plain TextNode. That node came back dirty, so the next
      // word cost another transform cycle, and the next, and the next: tokenizing
      // N words consumed N GLOBAL transform cycles. Lexical aborts the whole
      // update at 100 ("One or more transforms are endlessly triggering additional
      // transforms"), so Truesight was hard-capped at 100 words — measured
      // exactly: 100 words tokenized, 101 killed the editor and left ZERO word
      // nodes. Any real song or poem simply did not render, which reads as "the
      // resonance gate is censoring everything" when in fact the gate never ran.
      //
      // Splitting all words at once makes tokenization O(1) cycles in the word
      // count. splitText accepts multiple offsets and returns the pieces in order.
      const matches = [...textContent.matchAll(WORD_MATCH_REGEX_GLOBAL)];
      if (matches.length === 0) {
        return;
      }

      // Interior boundaries only: splitText ignores 0 and length, and a duplicate
      // offset would desync the returned pieces from the ranges below.
      const boundaries = [];
      for (const m of matches) {
        boundaries.push(m.index, m.index + m[0].length);
      }
      const offsets = [...new Set(boundaries)]
        .filter((offset) => offset > 0 && offset < textContent.length)
        .sort((a, b) => a - b);

      const pieces = offsets.length > 0 ? textNode.splitText(...offsets) : [textNode];

      // The word pieces, by exact text. A piece is a word iff it matches the
      // anchored token regex — the gaps (spaces, punctuation) never will. Replacing
      // a piece preserves its text length, so no later charStart shifts.
      const wordPieces = pieces.filter((piece) => {
        WORD_TOKEN_REGEX.lastIndex = 0;
        return WORD_TOKEN_REGEX.test(piece.getTextContent());
      });

      const gateIsActive = resonantCharStarts instanceof Map;

      for (const piece of wordPieces) {
        const word = piece.getTextContent();
        const globalCharStart = computeCharStartFromLexical(piece);
        const tokenData = lookupTokenData(piece, word);
        const tier = gateIsActive ? (resonantCharStarts.get(globalCharStart) || null) : 'rhyme';

        // Compute only the analysis we actually use (see the active branch).
        let truesight;
        let shouldColor;
        if (gateIsActive) {
          shouldColor = tier !== null;
          truesight = shouldColor ? tokenTruesight(tokenData || { token: word }, word) : wordTruesight(word);
        } else {
          truesight = wordTruesight(word);
          shouldColor = Boolean(truesight);
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
          truesightClass = tierColorClass(truesight.school, tier);
        } else if (truesight) {
          truesightClass = 'grimoire-word--grey';
        }

        const bytecode = tokenData?.bytecode;
        // The animated glow is the rhyme tier's signal; the assonance tier shows
        // only the soft school tint.
        const decodedStyle = (bytecode && shouldColor && tier !== 'assonance' && !isQuarantined) ? (tokenData.precomputed?.decoded || decodeBytecode(bytecode, { reducedMotion: false, theme })) : null;

        const truesightNode = $createTruesightWordNode(word, color, truesightClass, decodedStyle, false, tokenData);
        piece.replace(truesightNode);
      }
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
