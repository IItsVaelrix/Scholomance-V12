/**
 * Chromatic Immune Probe — SPECTRAL sub-frequency of the TrueSight immune system.
 *
 * The geometric probe (truesightImmuneProbe.js) measures WHERE word boxes are.
 * This probe measures WHAT COLOR they bleed. A word whose VerseIR color resolves
 * to a non-finite value (`#NaN…`, `hsl(NaN…)`, undefined channels) renders an
 * invalid CSS color: the glyph loses its hue AND its `--w` custom property
 * poisons the annotation box's `color-mix()` border — the box renders dead.
 *
 * Each corrupt color sheds a CRITICAL BytecodeHealth exosome (errorCode
 * PB-ERR-v1-TRUESIGHT-CHROMA-BLEED) carrying the FULL provenance trace — the
 * input (family/school/phase), every OKLCh channel, the PCA projection, exactly
 * which fields are non-finite, and the inferred leak stage — so the macrophage
 * can see precisely what went wrong, not just that something did.
 *
 * Node-only (BytecodeHealth uses node:crypto). The color engine it sweeps is
 * pure JS, so the corpus sweep needs no browser.
 */

import { BytecodeHealth } from './BytecodeHealth.js';
import { HEALTH_CODES, HEALTH_SEVERITY, CELL_IDS } from './diagnostic-constants.js';
import { propagate, ATTENUATION_MODELS } from '../pixelbrain/qbit-field.js';
import { runChemotaxis } from './truesightImmuneProbe.js';

// Spectral plane sits ABOVE the geometric invariant z-planes (I1..I4 = z0..z3).
export const SPECTRAL_Z = 4;
const GRID_W = 64;

const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);

/**
 * Validates a CSS color string. Catches the exact corruptions the pipeline can
 * emit: literal "NaN" (from `Math.round(NaN).toString(16)` or `hsl(${NaN})`),
 * undefined/null, and empty.
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validateColor(value) {
  if (value === null || value === undefined) return { valid: false, reason: 'null-or-undefined' };
  const s = String(value);
  if (s.trim() === '') return { valid: false, reason: 'empty' };
  if (/nan/i.test(s)) return { valid: false, reason: 'contains-NaN' };
  if (/undefined/i.test(s)) return { valid: false, reason: 'contains-undefined' };
  // Hex / rgb / hsl shape sanity — any channel that failed to render numerically.
  if (s.startsWith('#') && !/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s)) {
    return { valid: false, reason: 'malformed-hex' };
  }
  return { valid: true, reason: null };
}

/**
 * Forensic provenance: given a resolveVerseIrColor sample, determine exactly
 * which numeric stage went non-finite and which input caused it.
 * @param {object} sample { input:{family,school,phase}, hex, oklch:{l,c,h}, projection:{pc1,pc2,radius} }
 */
export function traceChromaProvenance(sample) {
  const { input = {}, oklch = {}, projection = {} } = sample;
  const nonFiniteFields = [];
  for (const [k, v] of Object.entries(oklch)) {
    // oklch channels are numeric (NaN when dead) or null — both are "non-finite".
    if (v === null || (typeof v === 'number' && !Number.isFinite(v))) nonFiniteFields.push(`oklch.${k}`);
  }
  for (const [k, v] of Object.entries(projection)) {
    // Only NUMERIC projection coordinates count — skip metadata like `family`.
    if (typeof v === 'number' && !Number.isFinite(v)) nonFiniteFields.push(`projection.${k}`);
  }

  // Stage inference (ordered from upstream to downstream).
  let suspectStage = 'OKLCH_EMIT';
  const rootInputs = [];
  const projBad = nonFiniteFields.some((f) => f.startsWith('projection.'));
  const lBad = nonFiniteFields.includes('oklch.l');
  const cBad = nonFiniteFields.includes('oklch.c');
  const hBad = nonFiniteFields.includes('oklch.h');

  if (projBad) {
    suspectStage = 'PCA_PROJECTION';
    rootInputs.push('projection (degenerate PCA basis for family)');
  } else if (lBad && !cBad && !hBad) {
    // Lightness is the ONLY channel that consumes `phase` (sin(phase·2π)).
    suspectStage = 'LIGHTNESS';
    if (!isFiniteNum(input.phase)) rootInputs.push(`phase=${String(input.phase)} (non-finite resonance tick)`);
    else rootInputs.push('lBase (baseHsl.l or projection.pc1)');
  } else if (hBad) {
    suspectStage = 'HUE';
    rootInputs.push('atan2(pc2,pc1) or baseHsl.h');
  } else if (cBad) {
    suspectStage = 'CHROMA';
    rootInputs.push('projection.radius or baseHsl.s');
  } else if (/nan/i.test(String(sample.hex))) {
    suspectStage = 'OKLCH_EMIT';
    rootInputs.push('oklchToHex clamp/toHex passed NaN through (NaN-unsafe)');
  }

  return { nonFiniteFields, suspectStage, rootInputs };
}

/**
 * Sheds one BytecodeHealth exosome for a color sample — CRITICAL CHROMA_BLEED if
 * corrupt, green CHROMA_OK otherwise. Context is the intricate forensic payload.
 */
export function shedChromaExosome(sample, opts = {}) {
  const verdict = validateColor(sample.hex);
  if (verdict.valid) {
    return new BytecodeHealth({
      code: HEALTH_CODES.TRUESIGHT_CHROMA_OK,
      cellId: CELL_IDS.VERSE_IR_RENDERER,
      checkId: 'VISUAL_BYTECODE_FIDELITY',
      moduleId: 'verse-ir-chroma-engine',
      context: { input: sample.input, hex: sample.hex, ok: true },
    });
  }

  const provenance = traceChromaProvenance(sample);
  return new BytecodeHealth({
    code: HEALTH_CODES.TRUESIGHT_CHROMA_BLEED,
    cellId: CELL_IDS.VERSE_IR_RENDERER,
    checkId: 'VISUAL_BYTECODE_FIDELITY',
    moduleId: opts.moduleId || 'verse-ir-chroma-engine',
    context: {
      category: 'SPECTRAL_PIPELINE',
      severity: HEALTH_SEVERITY.CRITICAL,
      word: sample.word ?? null,
      domIndex: sample.domIndex ?? null,
      input: sample.input,            // { family, school, phase }
      renderedColor: sample.hex,      // "#NaNNaNNaN"
      invalidReason: verdict.reason,  // "contains-NaN" | "malformed-hex" | ...
      oklch: sample.oklch,            // { l, c, h } — null where non-finite
      projection: sample.projection,  // { pc1, pc2, radius }
      nonFiniteFields: provenance.nonFiniteFields,
      suspectStage: provenance.suspectStage,
      rootCauseAnalysis: provenance.rootInputs.join('; '),
      leakSite: provenance.suspectStage === 'OKLCH_EMIT'
        ? 'oklch.js oklchToHex'
        : 'pcaChroma.js resolveVerseIrColor (NaN-unsafe clamp)',
    },
  });
}

// ─── Corpus sweep ───────────────────────────────────────────────────────────────
/**
 * Sweeps the color engine across families × schools × phases — INCLUDING
 * degenerate runtime inputs (non-finite phase) that fragile clamps leak on.
 * @param {Function} resolveFn - resolveVerseIrColor(family, school, { phase })
 * @returns {Array} samples [{ input, hex, oklch, projection }]
 */
export function sweepChromaCorpus(resolveFn, { families, schools, phases }) {
  const samples = [];
  for (const family of families) {
    for (const school of schools) {
      for (const phase of phases) {
        const r = resolveFn(family, school, { phase }) || {};
        samples.push({
          input: { family, school, phase: typeof phase === 'number' ? phase : String(phase) },
          hex: r.hex,
          oklch: r.oklch || {},
          projection: r.projection || {},
        });
      }
    }
  }
  return samples;
}

// ─── Orchestrator ───────────────────────────────────────────────────────────────
/**
 * Runs the full chromatic immune scan over color samples (corpus or live DOM).
 * Seeds the SPECTRAL z-plane, propagates the QBIT field, and walks chemotaxis to
 * the patient-zero cluster (the input class that poisons the most colors).
 */
export function runChromaticScan(samples, opts = {}) {
  const exosomes = samples.map((s) => shedChromaExosome(s, opts));
  const bleeds = [];
  samples.forEach((s, i) => {
    if (exosomes[i].code === HEALTH_CODES.TRUESIGHT_CHROMA_BLEED) {
      bleeds.push({ sample: s, exosome: exosomes[i], index: i });
    }
  });

  // Index families/schools for spatial layout.
  const familyIdx = new Map();
  const schoolIdx = new Map();
  for (const s of samples) {
    if (!familyIdx.has(s.input.family)) familyIdx.set(s.input.family, familyIdx.size);
    if (!schoolIdx.has(String(s.input.school))) schoolIdx.set(String(s.input.school), schoolIdx.size);
  }
  const dims = {
    width: GRID_W,
    height: Math.max(1, schoolIdx.size),
    depth: SPECTRAL_Z + 1,
    cellW: Math.max(1, familyIdx.size / (GRID_W - 1)),
  };

  let field = null;
  let chemotaxis = null;
  let patientZero = null;
  let antibody = null;

  if (bleeds.length) {
    const seeds = bleeds.map((b) => ({
      x: Math.max(0, Math.min(dims.width - 1, Math.round((familyIdx.get(b.sample.input.family) || 0) / dims.cellW))),
      y: Math.max(0, Math.min(dims.height - 1, schoolIdx.get(String(b.sample.input.school)) || 0)),
      z: SPECTRAL_Z,
      energy: 1,
      energyType: 'chroma-bleed',
    }));
    field = propagate(seeds, dims.width, dims.height, dims.depth, {
      attenuationModel: ATTENUATION_MODELS.PHI_ATTENUATION,
      iterations: 2,
    });
    chemotaxis = runChemotaxis(field, dims);

    // Patient zero = the dominant leak stage (shared root across symptoms).
    const byStage = new Map();
    for (const b of bleeds) {
      const stage = b.exosome.context.suspectStage;
      byStage.set(stage, (byStage.get(stage) || 0) + 1);
    }
    const dominantStage = [...byStage.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const rep = bleeds.find((b) => b.exosome.context.suspectStage === dominantStage);
    patientZero = {
      suspectStage: dominantStage,
      affectedSamples: byStage.get(dominantStage),
      totalBleeds: bleeds.length,
      representative: rep.exosome.context,
    };
    antibody = {
      checksum: rep.exosome.checksum,
      code: rep.exosome.code,
      bytecode: rep.exosome.bytecode,
      suspectStage: dominantStage,
      leakSite: rep.exosome.context.leakSite,
      rootCauseAnalysis: rep.exosome.context.rootCauseAnalysis,
      peakCell: chemotaxis.peak,
    };
  }

  return {
    healthy: bleeds.length === 0,
    sampleCount: samples.length,
    bleedCount: bleeds.length,
    dims,
    peakCell: chemotaxis ? chemotaxis.peak : null,
    patientZero,
    antibody,
    bleeds: bleeds.map((b) => b.exosome.toJSON()),
  };
}

/** One-line summary for logs. */
export function summarizeChromaReport(report) {
  if (report.healthy) return `CHROMA: clean — ${report.sampleCount} samples, 0 bleeds`;
  const pz = report.patientZero;
  return `CHROMA: ${report.bleedCount}/${report.sampleCount} bleeds | patient-zero stage=${pz.suspectStage} (${pz.affectedSamples}) | leak=${pz.representative.leakSite} | cause=${pz.representative.rootCauseAnalysis}`;
}
