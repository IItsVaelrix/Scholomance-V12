/**
 * Acronym Variations — ATS dual-form coverage analysis.
 *
 * ATS keyword matching is LITERAL: a posting that scans for "machine learning" will not
 * credit a résumé that only says "ML", and a posting scanning for "ML" will not credit one
 * that only spells it out. The robust move is to ensure BOTH the acronym and its expansion
 * appear at least once. This module DETECTS which industry acronyms a résumé uses in only
 * one form and reports the missing counterpart as a suggestion.
 *
 * It is analysis-only and never rewrites the résumé: WHERE to place a dual form (the common
 * convention is "Expansion (ACRONYM)" on first use) is an authoring decision a blind swap
 * gets wrong, so — like the legibility arbiter and the JD boundary audit — this flags and
 * explains rather than auto-editing.
 *
 * Dependency direction (PDR §6): a leaf consumer of `text-utils.js` and `stopwords.js`, the
 * same primitives the keyword-gap analyzer uses, so résumé/JD text is tokenized identically
 * and matches stay symmetric. Pure, deterministic, frozen output — no clocks, no randomness,
 * no I/O, no PII persistence.
 *
 * @typedef {Object} AcronymGap
 * @property {string}  acronym      - canonical acronym, displayed upper-cased
 * @property {string}  expansion    - canonical spelled-out form
 * @property {'acronym'|'expansion'} present     - the form the résumé already contains
 * @property {'acronym'|'expansion'} missingForm - the form to add
 * @property {boolean} inJobDescription - the term (either form) appears in the JD
 * @property {string}  suggestion   - plain-language fix
 *
 * @typedef {Object} AcronymCoverage
 * @property {string}  acronym
 * @property {string}  expansion
 * @property {boolean} inJobDescription
 *
 * @typedef {Object} AcronymReport
 * @property {1} schemaVersion
 * @property {AcronymGap[]} gaps
 * @property {AcronymCoverage[]} covered
 * @property {Object} metadata
 */

import { normalizeText, stem } from './text-utils.js';
import { STOPWORDS } from './stopwords.js';

const DEFAULT_MIN_LENGTH = 3;

/**
 * Curated cross-domain acronym → expansion map. Keys are stored exactly as
 * `normalizeText` yields them (lower-case; hyphen kept for "ci-cd") so lookups are
 * symmetric with extracted résumé tokens. Expansions are the canonical spelled-out form.
 * Frozen so no consumer can mutate the shared vocabulary (determinism contract).
 */
export const ACRONYM_MAP = Object.freeze({
  // Engineering / data
  'ml': 'Machine Learning',
  'ai': 'Artificial Intelligence',
  'nlp': 'Natural Language Processing',
  'api': 'Application Programming Interface',
  'sql': 'Structured Query Language',
  'ci-cd': 'Continuous Integration and Continuous Delivery',
  'etl': 'Extract Transform Load',
  'aws': 'Amazon Web Services',
  'gcp': 'Google Cloud Platform',
  // Product / design
  'ui': 'User Interface',
  'ux': 'User Experience',
  'qa': 'Quality Assurance',
  'seo': 'Search Engine Optimization',
  // Business / operations
  'kpi': 'Key Performance Indicator',
  'roi': 'Return on Investment',
  'saas': 'Software as a Service',
  'crm': 'Customer Relationship Management',
  'sla': 'Service Level Agreement',
  'b2b': 'Business to Business',
  'b2c': 'Business to Consumer',
});

/** Escapes regex metacharacters in a literal term. */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Whether `acronym` appears as a whitespace-bounded token in already-normalized text.
 * Tolerates the hyphen/space/joined variants of a compound acronym ("ci-cd" also matches
 * "ci cd" and "cicd") because `normalizeText` turns a slash into a space, so an author's
 * "CI/CD" arrives here as "ci cd".
 */
function hasAcronym(normalized, acronym) {
  const variants = new Set([acronym, acronym.replace(/-/g, ' '), acronym.replace(/-/g, '')]);
  for (const variant of variants) {
    if (new RegExp(`(?:^|\\s)${escapeRegExp(variant)}(?:\\s|$)`).test(normalized)) return true;
  }
  return false;
}

/** Builds a Set of stems for the role-bearing tokens of already-normalized text. */
function buildStemSet(normalized) {
  const set = new Set();
  if (!normalized) return set;
  for (const tok of normalized.split(' ')) {
    if (tok.length >= DEFAULT_MIN_LENGTH && !STOPWORDS.has(tok)) set.add(stem(tok));
  }
  return set;
}

/** The role-bearing (non-stopword) content words of an expansion, as stems. */
function expansionStems(expansion) {
  return normalizeText(expansion)
    .split(' ')
    .filter((w) => w.length >= DEFAULT_MIN_LENGTH && !STOPWORDS.has(w))
    .map(stem);
}

/** Whether every content word of `expansion` is present in `stemSet`. */
function hasExpansion(stemSet, expansion) {
  const stems = expansionStems(expansion);
  if (stems.length === 0) return false;
  return stems.every((s) => stemSet.has(s));
}

/**
 * Stable order for gaps: JD-relevant first (those are the ones an applied posting actually
 * scans for), then alphabetical by acronym. Never relies on object-key iteration order.
 */
function byRelevanceThenAcronym(a, b) {
  if (a.inJobDescription !== b.inJobDescription) return a.inJobDescription ? -1 : 1;
  if (a.acronym < b.acronym) return -1;
  if (a.acronym > b.acronym) return 1;
  return 0;
}

/**
 * Analyzes a résumé for single-form acronym usage and reports the missing counterparts.
 *
 * An acronym is only considered when the résumé already uses it in at least one form — we
 * never suggest adding a skill the candidate has not claimed. When a job description is
 * supplied, gaps whose term appears in the JD are surfaced first.
 *
 * @param {string} resumeText
 * @param {string} [jobDescriptionText='']
 * @param {Object} [options]
 * @param {Record<string,string>} [options.acronymMap=ACRONYM_MAP]
 * @returns {AcronymReport}
 */
export function analyzeAcronymCoverage(resumeText, jobDescriptionText = '', options = {}) {
  const acronymMap =
    options.acronymMap && typeof options.acronymMap === 'object' ? options.acronymMap : ACRONYM_MAP;

  const normalizedResume = normalizeText(resumeText);
  const normalizedJd = normalizeText(jobDescriptionText);
  const resumeStemSet = buildStemSet(normalizedResume);
  const jdStemSet = buildStemSet(normalizedJd);

  const gaps = [];
  const covered = [];

  for (const [acronym, expansion] of Object.entries(acronymMap)) {
    const acronymPresent = hasAcronym(normalizedResume, acronym);
    const expansionPresent = hasExpansion(resumeStemSet, expansion);
    if (!acronymPresent && !expansionPresent) continue; // not claimed — never suggest

    const inJobDescription =
      hasAcronym(normalizedJd, acronym) || hasExpansion(jdStemSet, expansion);
    const display = acronym.toUpperCase();

    if (acronymPresent && expansionPresent) {
      covered.push(Object.freeze({ acronym: display, expansion, inJobDescription }));
      continue;
    }

    const present = acronymPresent ? 'acronym' : 'expansion';
    const missingForm = acronymPresent ? 'expansion' : 'acronym';
    const suggestion = acronymPresent
      ? `You use "${display}" but never spell it out. Add "${expansion}" once (e.g. "${expansion} (${display})") so a posting that scans for the full term still matches.`
      : `You spell out "${expansion}" but never use the acronym. Add "${display}" once so a posting that scans for the short form still matches.`;

    gaps.push(Object.freeze({ acronym: display, expansion, present, missingForm, inJobDescription, suggestion }));
  }

  gaps.sort(byRelevanceThenAcronym);

  return Object.freeze({
    schemaVersion: 1,
    gaps: Object.freeze(gaps),
    covered: Object.freeze(covered),
    metadata: Object.freeze({
      deterministic: true,
      acronymsConsidered: Object.keys(acronymMap).length,
      jobDescriptionSupplied: normalizedJd.length > 0,
    }),
  });
}
