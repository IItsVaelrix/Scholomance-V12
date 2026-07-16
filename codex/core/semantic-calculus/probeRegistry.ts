/**
 * SEMANTIC CALCULUS — harvested Probe formulas (rev 7 P1)
 *
 * Four real inquiry formulas. Not a generic probe language.
 * effect is always read-only; maxRisk is always read_only.
 * Compiler never executes harnesses — only seals plans/reports.
 */

import type {
  CausalHypothesis,
  ObservationRequest,
  ProbePlanPayload,
} from './types.ts';

export interface ProbeFormula {
  id: string;
  version: string;
  /** Patterns that bind this probe (normalized lowercase). */
  patterns: readonly string[];
  keywords: readonly string[];
  observations: readonly ObservationRequest[];
  hypotheses: readonly CausalHypothesis[];
  maxRisk: 'read_only';
  citeSeeds: readonly string[];
}

const CSP_PROBE: ProbeFormula = Object.freeze({
  id: 'runtime.csp.img_src',
  version: '1.0.0',
  patterns: [
    'why are covers blank',
    'why is cover art missing',
    'why suno art not showing',
    'diagnose csp images',
    'why images blocked in production',
  ],
  keywords: ['csp', 'img-src', 'cover art', 'cdn2.suno', 'content security'],
  observations: [
    {
      id: 'obs.csp.header',
      description: 'Read Content-Security-Policy img-src from the production document response',
      harness: 'http.response_headers.csp',
      required: true,
    },
  ],
  hypotheses: [
    {
      id: 'h_csp_blocks_cdn2',
      claim: 'Production CSP img-src omits https://cdn2.suno.ai so Suno covers are blocked',
      predictions: [
        {
          id: 'p_csp_present',
          description: 'CSP header is present',
          required: true,
          observationId: 'obs.csp.header',
        },
      ],
      falsifiers: [
        {
          id: 'f_csp_allows_cdn2',
          description: 'img-src explicitly allows cdn2.suno.ai',
          observationId: 'obs.csp.header',
          predicate: { op: 'csp_allows_host', host: 'cdn2.suno.ai' },
        },
      ],
      citeSeeds: ['codex/server/index.js', 'imgSrc'],
    },
    {
      id: 'h_csp_allows_images',
      claim: 'CSP permits cdn2 — cover blankness is not a CSP img-src failure',
      predictions: [
        {
          id: 'p_allows',
          description: 'cdn2 allowed',
          required: true,
          observationId: 'obs.csp.header',
        },
      ],
      falsifiers: [
        {
          id: 'f_blocks',
          description: 'cdn2 blocked by img-src',
          observationId: 'obs.csp.header',
          predicate: { op: 'csp_blocks_host', host: 'cdn2.suno.ai' },
        },
      ],
      citeSeeds: ['codex/server/index.js'],
    },
  ],
  maxRisk: 'read_only',
  citeSeeds: ['codex/server/index.js'],
});

const CDN_PROBE: ProbeFormula = Object.freeze({
  id: 'cdn.asset.http',
  version: '1.0.0',
  patterns: [
    'why cover url 403',
    'diagnose suno cdn covers',
    'why video gen cover fails',
  ],
  keywords: ['403', 'cdn', 'cover url', 'video_gen', 'hotlink'],
  observations: [
    {
      id: 'obs.cdn.head',
      description: 'HTTP HEAD coverUrl values from Visualiser track metadata',
      harness: 'http.head.cover_urls',
      required: true,
    },
  ],
  hypotheses: [
    {
      id: 'h_cdn_403',
      claim: 'Some cover URLs return HTTP 403 from Suno CDN',
      predictions: [
        {
          id: 'p_has_403',
          description: 'At least one HEAD is 403',
          required: true,
          observationId: 'obs.cdn.head',
        },
      ],
      falsifiers: [
        {
          id: 'f_all_200',
          description: 'All sampled URLs return 200',
          observationId: 'obs.cdn.head',
          predicate: { op: 'eq', path: 'allOk', value: true },
        },
      ],
      citeSeeds: ['src/pages/Visualiser/tracks'],
    },
  ],
  maxRisk: 'read_only',
  citeSeeds: ['src/pages/Visualiser/tracks'],
});

const RENDER_STACK_PROBE: ProbeFormula = Object.freeze({
  id: 'render.stack.listen',
  version: '1.0.0',
  patterns: [
    'why listen animations fail',
    'why listen page stutters',
    'diagnose listen render stack',
    'why listen janks on low tier',
  ],
  keywords: ['listen', 'stutter', 'webgl', 'phaser', 'dual gpu', 'low tier', 'animation'],
  observations: [
    {
      id: 'obs.render.active_contexts',
      description: 'Count active WebGL/WebGL2 contexts and Phaser games on /listen',
      harness: 'dom.webgl.context_count',
      required: true,
    },
  ],
  hypotheses: [
    {
      id: 'h_dual_webgl',
      claim: 'Multiple simultaneous GPU pipelines (Phaser + WebGL2 shader + canvas) exhaust low-tier budgets',
      predictions: [
        {
          id: 'p_multi',
          description: 'More than one WebGL context active',
          required: true,
          observationId: 'obs.render.active_contexts',
        },
      ],
      falsifiers: [
        {
          id: 'f_single',
          description: 'Only one GPU context active',
          observationId: 'obs.render.active_contexts',
          predicate: { op: 'eq', path: 'webglContexts', value: 1 },
        },
      ],
      citeSeeds: [
        'src/pages/Listen/AlchemicalLabBackground.tsx',
        'src/ui/animation/pbstage/PBShaderStage.tsx',
      ],
    },
    {
      id: 'h_reduced_motion',
      claim: 'prefers-reduced-motion is forcing a static chamber',
      predictions: [
        {
          id: 'p_prm',
          description: 'reduced motion media query matches',
          required: true,
          observationId: 'obs.render.active_contexts',
        },
      ],
      falsifiers: [
        {
          id: 'f_not_prm',
          description: 'reduced motion is false',
          observationId: 'obs.render.active_contexts',
          predicate: { op: 'eq', path: 'prefersReducedMotion', value: false },
        },
      ],
      citeSeeds: ['src/hooks/usePrefersReducedMotion.js'],
    },
  ],
  maxRisk: 'read_only',
  citeSeeds: ['src/pages/Listen'],
});

const STATION_VIS_PROBE: ProbeFormula = Object.freeze({
  id: 'motion.visibility.station',
  version: '1.0.0',
  patterns: [
    'why station animates offscreen',
    'diagnose scholomance station visibility',
    'is crystal ball running when closed',
  ],
  keywords: ['station', 'crystal ball', 'offscreen', 'visibility', 'scholomance station'],
  observations: [
    {
      id: 'obs.station.mount',
      description: 'Whether CrystalBallVisualizer mounts only when viewMode is STATION',
      harness: 'react.mount.station_crystal',
      required: true,
    },
  ],
  hypotheses: [
    {
      id: 'h_station_always_on',
      claim: 'CrystalBall Phaser runs while Scholomance Station is not visible',
      predictions: [
        {
          id: 'p_mounted_closed',
          description: 'CrystalBall mounted in CHAMBER mode',
          required: true,
          observationId: 'obs.station.mount',
        },
      ],
      falsifiers: [
        {
          id: 'f_only_station',
          description: 'Mounted only when STATION',
          observationId: 'obs.station.mount',
          predicate: { op: 'eq', path: 'mountedOnlyWhenStation', value: true },
        },
      ],
      citeSeeds: [
        'src/pages/Listen/CrystalBallVisualizer.tsx',
        'src/pages/Listen/ListenPage.tsx',
      ],
    },
  ],
  maxRisk: 'read_only',
  citeSeeds: ['src/pages/Listen/ScholomanceStation.tsx'],
});

export const PROBE_FORMULAS: readonly ProbeFormula[] = Object.freeze([
  CSP_PROBE,
  CDN_PROBE,
  RENDER_STACK_PROBE,
  STATION_VIS_PROBE,
]);

export function getProbe(id: string): ProbeFormula | undefined {
  return PROBE_FORMULAS.find((p) => p.id === id);
}

export function listProbeIds(): string[] {
  return PROBE_FORMULAS.map((p) => p.id);
}

function normalize(s: string): string {
  return String(s ?? '')
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '');
}

/**
 * Bind an utterance to a Probe formula via exact pattern or keyword density.
 * Returns undefined when inquiry lexicon misses (caller may Theory + gap procedure).
 */
export function bindInquiryProbe(utterance: string): ProbeFormula | undefined {
  const text = normalize(utterance);
  for (const probe of PROBE_FORMULAS) {
    for (const pat of probe.patterns) {
      if (text === normalize(pat) || text.includes(normalize(pat))) return probe;
    }
  }
  let best: { probe: ProbeFormula; score: number } | undefined;
  for (const probe of PROBE_FORMULAS) {
    let score = 0;
    for (const kw of probe.keywords) {
      if (text.includes(normalize(kw))) score += 1;
    }
    if (score >= 2 && (!best || score > best.score)) best = { probe, score };
  }
  return best?.probe;
}

/** Build a plan payload for sealing. Does NOT run observations. */
export function buildProbePlan(probe: ProbeFormula): ProbePlanPayload {
  return Object.freeze({
    phase: 'plan' as const,
    probeId: probe.id,
    observations: probe.observations,
    hypotheses: probe.hypotheses,
    maxRisk: 'read_only' as const,
    expectedReceipts: probe.observations.map((o) => o.id),
  });
}

export function probeRegistryVersion(): string {
  return PROBE_FORMULAS.map((p) => `${p.id}@${p.version}`).sort().join(',');
}
