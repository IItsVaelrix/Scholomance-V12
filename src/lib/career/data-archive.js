/**
 * Data Archive assembler.
 *
 * Turns the three deterministic analyses the pipeline already produces — the transmuter's
 * change provenance, the keyword-gap report, and the ATS legibility audit — into one
 * render-ready, itemized record explaining WHY every change was made and FOR WHAT purpose.
 * This is the data behind the UI "Data Archive" drawer.
 *
 * Pure: a structural transform over its inputs. No engines, no clocks, no randomness — so
 * the same (changes, report, legibility) always yields the same archive.
 *
 * @typedef {Object} ArchiveEntry
 * @property {string} label   - the headline (e.g. "Managed → Oversaw")
 * @property {string} [detail]- a short qualifier (e.g. "Line 4 · clause-leading")
 * @property {string} reason  - the full plain-language rationale
 *
 * @typedef {Object} ArchiveSection
 * @property {string} id
 * @property {string} title
 * @property {string} summary
 * @property {ArchiveEntry[]} entries
 * @property {Object} [meta] - section-specific extras (score, matched/missing, lines)
 */

const pluralize = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function buildVerbSection(changes) {
  const swaps = changes.filter((c) => c.type === 'verb_swap');
  return {
    id: 'verbs',
    title: 'Verb Elevations',
    summary:
      swaps.length === 0
        ? 'No verbs were elevated — your wording was already strong or held literal.'
        : `${pluralize(swaps.length, 'verb')} elevated to stronger, object-agnostic forms.`,
    entries: swaps.map((c) => ({
      label: `${c.from} → ${c.to}`,
      detail: `Line ${c.lineNumber} · ${c.capitalization}`,
      reason: c.reason,
    })),
  };
}

function buildPreservedSection(report) {
  const conflicts = report.torqueConflicts || [];
  return {
    id: 'preserved',
    title: 'Keywords Preserved Verbatim',
    summary:
      conflicts.length === 0
        ? 'No JD keyword collided with the verb map, so nothing needed protecting.'
        : `${pluralize(conflicts.length, 'JD keyword')} held literal to protect your match score.`,
    entries: conflicts.map((c) => ({
      label: c.jobTerm,
      detail: `would have become "${c.wouldReplaceWith}"`,
      reason:
        `"${c.jobTerm}" is a keyword in the target job description. Rewriting it to ` +
        `"${c.wouldReplaceWith}" would delete the exact term the ATS scans for and lower the ` +
        `alignment we just measured — so it was kept verbatim.`,
    })),
  };
}

function buildAlignmentSection(report) {
  const matched = (report.matched || []).map((h) => h.term);
  const missing = (report.missing || []).map((h) => h.term);
  const total = matched.length + missing.length;
  return {
    id: 'alignment',
    title: 'JD Alignment',
    summary:
      total === 0
        ? 'No job description supplied, so alignment is not measurable.'
        : `Resonance alignment ${report.score}/100 — ${matched.length} of ${total} scored JD keywords matched.`,
    entries: missing.map((term) => ({
      label: term,
      reason: `Present in the JD but absent from your experience — a gap worth addressing if it is genuinely a skill you have.`,
    })),
    meta: {
      score: report.score ?? null,
      rawScore: report.rawScore ?? null,
      matched,
      missing,
      note:
        'Score is computed on your RAW experience (before any swaps), so it reflects your real ' +
        'alignment, not the optimized artifact.',
    },
  };
}

function buildAnchorSection(changes) {
  const anchor = changes.find((c) => c.type === 'anchor_infusion');
  const anchors = anchor?.anchors || [];
  const jdMatched = anchor?.source === 'jd_matched';
  return {
    id: 'anchors',
    title: 'Resonance Anchors',
    summary:
      anchors.length === 0
        ? 'No anchor line was appended.'
        : `${pluralize(anchors.length, 'keyword anchor')} appended as a trailing density line` +
          (jdMatched ? ', drawn from JD-matched skills.' : ' (generic placeholders).'),
    entries: anchors.map((a) => ({ label: a, reason: anchor.reason })),
    meta: {
      caution: jdMatched
        ? 'These anchors are skills you genuinely have that the JD also asks for, so they reinforce ' +
          'real alignment. Still read as a list, not prose — trim any a bullet already covers.'
        : 'These are generic placeholders (no JD supplied to derive real keywords). They read as a ' +
          'list and are off-domain — remove them before sending; an irrelevant anchor line hurts.',
    },
  };
}

function buildBoundaryWarningSection(jdBoundaryWarnings) {
  const warnings = jdBoundaryWarnings || [];
  return {
    id: 'boundary_warnings',
    title: 'JD Boundary Warnings',
    summary:
      warnings.length === 0
        ? 'No unpunctuated keyword runs detected in the job description.'
        : `${pluralize(warnings.length, 'job-description line')} read as an unpunctuated keyword ` +
          `run — phrases extracted from them may merge unrelated terms.`,
    entries: warnings.map((w) => ({
      label: w.text,
      detail: `legibility ${w.legibilityScore}`,
      reason:
        'This line has no internal punctuation and reads as one long run of keywords, so the ' +
        'matcher cannot tell where one skill ends and the next begins — multi-word phrases drawn ' +
        'from it may be unreliable. Add commas or semicolons between items for accurate matching. ' +
        '(Flagged by the legibility arbiter, not auto-corrected.)',
    })),
  };
}

function buildLegibilitySection(legibility) {
  const flagged = legibility?.flagged || [];
  const lines = legibility?.lines || [];
  return {
    id: 'legibility',
    title: 'Legibility Audit',
    summary:
      `Overall legibility ${legibility?.legibilityScore ?? 1}. ` +
      (flagged.length === 0
        ? 'No lines flagged as keyword-stuffed.'
        : `${pluralize(flagged.length, 'line')} flagged as keyword-stuffed.`),
    entries: flagged.map((l) => ({
      label: l.text,
      detail: `legibility ${l.legibilityScore}`,
      reason:
        'Reads as a keyword pile rather than natural prose (near-zero connective words and/or a ' +
        'long unbroken run of content words). ATS parsers and human readers both penalize this.',
    })),
    meta: {
      score: legibility?.legibilityScore ?? null,
      lines: lines.map((l) => ({ text: l.text, verdict: l.verdict, score: l.legibilityScore })),
      note:
        'Legibility is a model-grounded heuristic (a content/function-word HMM). Trust the relative ' +
        'ranking of lines more than the absolute cutoff until it is calibrated on a labelled corpus.',
    },
  };
}

/**
 * Assembles the full Data Archive from the pipeline's analyses.
 *
 * @param {{ changes: Array<object>, report: object, legibility: object }} inputs
 * @returns {{ schemaVersion: 1, alignmentScore: number|null, legibilityScore: number|null, sections: ArchiveSection[] }}
 */
export function assembleDataArchive({
  changes = [],
  report = {},
  legibility = {},
  jdBoundaryWarnings = [],
} = {}) {
  const sections = [
    buildVerbSection(changes),
    buildPreservedSection(report),
    buildAlignmentSection(report),
    buildBoundaryWarningSection(jdBoundaryWarnings),
    buildAnchorSection(changes),
    buildLegibilitySection(legibility),
  ];

  return {
    schemaVersion: 1,
    alignmentScore: report.score ?? null,
    legibilityScore: legibility?.legibilityScore ?? null,
    sections,
  };
}
