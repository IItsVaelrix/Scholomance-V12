import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_CODES,
  ERROR_SEVERITY,
  MODULE_IDS,
} from '../pixelbrain/bytecode-error.js';
import { hashString, roundTo } from '../pixelbrain/shared.js';

export const MANIFOLD_BYTECODE_SCHEMA = 'manifold.bytecode.v1';
export const MANIFOLD_PRESET_SCHEMA = 'manifold.preset.v1';
export const MANIFOLD_KERNEL_SEMVER = '0.1.0';

export const MANIFOLD_EVENTS = Object.freeze([
  'sub_transient',
  'full_spectrum_impact',
  'high_crunch',
  'harmonic_sustain',
  'wide_noise_burst',
  'vocal_presence',
  'silence_gap',
  'dense_spectral_cloud',
]);

const VALID_EVENTS = new Set(MANIFOLD_EVENTS);
const VALID_ZONES = new Set([
  'floor',
  'ceiling',
  'left_wall',
  'right_wall',
  'front_wall',
  'rear_wall',
  'core',
  'void_layer',
]);
const VALID_DIVISIONS = new Set(['1/8', '1/16', '1/32', '1/64']);
const MAX_FEEDBACK = 0.72;
const DEFAULT_SAFETY = Object.freeze({
  maxFeedback: 0.58,
  maxFilterQ: 12,
  maxSprayDensity: 0,
  maxDelayMs: 750,
  minRampMs: 20,
  cpuBudgetClass: 'low',
  requiresLimiter: true,
  hasUnsafeCycles: false,
});

export function compileManifoldDsl(source) {
  const errors = [];

  if (typeof source !== 'string' || source.trim().length === 0) {
    return compileFailure([
      createManifoldError('MANIFOLD_EMPTY_SOURCE', 'DSL source must be a non-empty string', {
        sourceType: typeof source,
      }),
    ]);
  }

  const ast = parseManifoldDsl(source, errors);
  if (!ast) return compileFailure(errors);

  validateAst(ast, errors);
  if (errors.length > 0) return compileFailure(errors);

  const instructions = emitInstructions(ast);
  const safety = buildSafetyManifest(instructions);
  const graph = planDspGraph(ast);
  const canonicalBytecode = stableStringify({
    name: ast.name,
    clock: ast.clock,
    bpm: ast.bpm,
    instructions,
    safety,
    graph,
  });
  const contentHash = hashString(canonicalBytecode);

  return {
    ok: true,
    program: {
      schemaVersion: MANIFOLD_BYTECODE_SCHEMA,
      kernelSemver: MANIFOLD_KERNEL_SEMVER,
      contentHash,
      id: `MANIFOLD-${contentHash.toString(16).toUpperCase().padStart(8, '0')}`,
      name: ast.name,
      sampleRatePolicy: 'adaptive',
      instructions,
      safety,
      graph,
    },
    errors: [],
    ast,
  };
}

export function classifyManifoldEvents(features) {
  const safe = normalizeFeatures(features);
  const candidates = [
    {
      event: 'sub_transient',
      confidence: average([safe.lowEnergy, safe.transientSharpness, safe.crestFactor]) - 0.01,
      threshold: 0.6,
    },
    {
      event: 'full_spectrum_impact',
      confidence: average([safe.lowEnergy, safe.midEnergy, safe.highEnergy, safe.transientSharpness, safe.peak]) + 0.02,
      threshold: 0.68,
    },
    {
      event: 'high_crunch',
      confidence: average([safe.highEnergy, safe.spectralFlux, safe.spectralCentroid]),
      threshold: 0.65,
    },
    {
      event: 'harmonic_sustain',
      confidence: average([safe.harmonicity, safe.rms]) - 0.02,
      threshold: 0.55,
    },
    {
      event: 'wide_noise_burst',
      confidence: average([safe.inputWidth, safe.highEnergy, safe.spectralFlux]),
      threshold: 0.62,
    },
    {
      event: 'vocal_presence',
      confidence: average([safe.midEnergy, safe.harmonicity, 1 - Math.abs(safe.spectralCentroid - 0.55)]),
      threshold: 0.66,
    },
    {
      event: 'silence_gap',
      confidence: average([1 - safe.rms, 1 - safe.peak, 1 - safe.spectralFlux]),
      threshold: 0.78,
    },
    {
      event: 'dense_spectral_cloud',
      confidence: average([safe.rms, safe.spectralFlux, safe.midEnergy, safe.highEnergy]) + 0.02,
      threshold: 0.66,
    },
  ];

  return candidates
    .filter((candidate) => candidate.confidence >= candidate.threshold)
    .map((candidate) => ({
      event: candidate.event,
      confidence: roundTo(candidate.confidence, 2),
    }));
}

export function loadManifoldPreset(preset) {
  if (!preset || typeof preset !== 'object') {
    return {
      ok: false,
      recompiled: false,
      program: null,
      errors: [
        createManifoldError('MANIFOLD_INVALID_PRESET', 'Preset must be an object', {
          presetType: typeof preset,
        }),
      ],
    };
  }

  if (preset.schemaVersion !== MANIFOLD_PRESET_SCHEMA) {
    return {
      ok: false,
      recompiled: false,
      program: null,
      errors: [
        createManifoldError('MANIFOLD_INVALID_PRESET_SCHEMA', 'Preset schema is not manifold.preset.v1', {
          schemaVersion: preset.schemaVersion,
        }),
      ],
    };
  }

  const compiled = compileManifoldDsl(preset.dslSource);
  if (!compiled.ok) {
    return { ...compiled, recompiled: false };
  }

  const cached = preset.bytecode;
  const cacheMatches = Boolean(
    cached
      && cached.schemaVersion === compiled.program.schemaVersion
      && cached.kernelSemver === compiled.program.kernelSemver
      && cached.contentHash === compiled.program.contentHash,
  );

  return {
    ok: true,
    recompiled: !cacheMatches,
    program: cacheMatches ? cached : compiled.program,
    errors: [],
  };
}

function compileFailure(errors) {
  return {
    ok: false,
    program: null,
    errors,
    ast: null,
  };
}

function parseManifoldDsl(source, errors) {
  const header = source.match(/manifold\s+([A-Za-z][\w-]*)\s*\{([\s\S]*)\}\s*$/);
  if (!header) {
    errors.push(createManifoldError('MANIFOLD_PARSE_FAILED', 'Expected `manifold Name { ... }`', {}));
    return null;
  }

  const [, name, body] = header;
  const clockMatch = body.match(/\bclock\s+(internal|free)(?:\s+(\d+(?:\.\d+)?))?/);
  const materialNames = new Set();
  const materials = [];
  const zones = [];

  for (const materialMatch of body.matchAll(/material\s+([A-Za-z][\w-]*)\s*\{([\s\S]*?)\n\s*\}/g)) {
    const material = {
      name: materialMatch[1],
      parameters: parseMaterialParameters(materialMatch[2]),
    };
    materials.push(material);
    materialNames.add(material.name);
  }

  for (const zoneBlock of extractZoneBlocks(body)) {
    const zoneBody = zoneBlock.body;
    const listener = zoneBody.match(/listen\s+([A-Za-z_][\w-]*)\s+threshold\s+(-?\d+(?:\.\d+)?)/);
    const trigger = zoneBody.match(/on\s+trigger\s*\{([\s\S]*?)\n\s*\}/);
    zones.push({
      name: zoneBlock.name,
      material: zoneBlock.material,
      listener: listener
        ? { event: listener[1], threshold: Number(listener[2]) }
        : null,
      actions: trigger ? parseActions(trigger[1], zoneBlock.name, errors) : [],
    });
  }

  return {
    name,
    clock: clockMatch?.[1] ?? 'free',
    bpm: clockMatch?.[2] ? Number(clockMatch[2]) : null,
    materials,
    materialNames,
    zones,
  };
}

function extractZoneBlocks(body) {
  const blocks = [];
  const zonePattern = /zone\s+([A-Za-z_][\w-]*)\s+uses\s+([A-Za-z][\w-]*)\s*\{/g;
  let match;

  while ((match = zonePattern.exec(body)) !== null) {
    const openBraceIndex = zonePattern.lastIndex - 1;
    const closeBraceIndex = findMatchingBrace(body, openBraceIndex);
    if (closeBraceIndex < 0) continue;
    blocks.push({
      name: match[1],
      material: match[2],
      body: body.slice(openBraceIndex + 1, closeBraceIndex),
    });
    zonePattern.lastIndex = closeBraceIndex + 1;
  }

  return blocks;
}

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  for (let index = openBraceIndex; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseMaterialParameters(body) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/))
    .reduce((parameters, parts) => {
      if (parts.length === 2) {
        parameters[parts[0]] = Number(parts[1]);
      } else if (parts.length === 3) {
        parameters[`${parts[0]}.${parts[1]}`] = Number(parts[2]);
      }
      return parameters;
    }, {});
}

function parseActions(body, zone, errors) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseAction(line, zone, errors))
    .filter(Boolean);
}

function parseAction(line, zone, errors) {
  const morphTo = line.match(/^morph\s+([\w.]+)\s+to\s+(-?\d+(?:\.\d+)?)\s+in\s+(\d+)ms$/);
  if (morphTo) {
    return {
      kind: 'morphTo',
      target: scopedTarget(zone, morphTo[1]),
      value: Number(morphTo[2]),
      durationMs: Number(morphTo[3]),
    };
  }

  const morphScale = line.match(/^morph\s+([\w.]+)\s+scale\s+(-?\d+(?:\.\d+)?)\s+in\s+(\d+)ms$/);
  if (morphScale) {
    return {
      kind: 'morphScale',
      target: scopedTarget(zone, morphScale[1]),
      factor: Number(morphScale[2]),
      durationMs: Number(morphScale[3]),
    };
  }

  const clamp = line.match(/^clamp\s+feedback\s+max\s+(-?\d+(?:\.\d+)?)$/);
  if (clamp) {
    return { kind: 'clampFeedback', node: `${zone}.feedback`, max: Number(clamp[1]) };
  }

  const spray = line.match(/^spray\s+micro_delay\s+division\s+(1\/(?:8|16|32|64))\s+density\s+(-?\d+(?:\.\d+)?)\s+duration\s+(\d+)ms$/);
  if (spray) {
    return {
      kind: 'spray',
      division: spray[1],
      density: Number(spray[2]),
      durationMs: Number(spray[3]),
    };
  }

  const bloom = line.match(/^bloom\s+harmonic\s+amount\s+(-?\d+(?:\.\d+)?)\s+duration\s+(\d+)ms$/);
  if (bloom) {
    return { kind: 'bloom', amount: Number(bloom[1]), durationMs: Number(bloom[2]) };
  }

  const widen = line.match(/^widen\s+tail\s+to\s+(-?\d+(?:\.\d+)?)\s+in\s+(\d+)ms$/);
  if (widen) {
    return {
      kind: 'widen',
      target: `${zone}.tail.width`,
      value: Number(widen[1]),
      durationMs: Number(widen[2]),
    };
  }

  const freeze = line.match(/^freeze\s+([\w.]+)\s+in\s+(\d+)ms$/);
  if (freeze) {
    return { kind: 'crossfade', from: scopedTarget(zone, freeze[1]), to: 'held_tail', durationMs: Number(freeze[2]) };
  }

  const crossfade = line.match(/^crossfade\s+([\w.]+)\s+to\s+([\w.]+)\s+in\s+(\d+)ms$/);
  if (crossfade) {
    return {
      kind: 'crossfade',
      from: scopedTarget(zone, crossfade[1]),
      to: scopedTarget(zone, crossfade[2]),
      durationMs: Number(crossfade[3]),
    };
  }

  errors.push(createManifoldError('MANIFOLD_UNKNOWN_ACTION', `Unknown action: ${line}`, { line }));
  return null;
}

function scopedTarget(zone, target) {
  return target.includes('.') ? `${zone}.${target}` : `${zone}.${target}`;
}

function validateAst(ast, errors) {
  if (ast.materials.length === 0) {
    errors.push(createManifoldError('MANIFOLD_MISSING_MATERIAL', 'At least one material is required', {}));
  }
  if (ast.zones.length === 0) {
    errors.push(createManifoldError('MANIFOLD_MISSING_ZONE', 'At least one zone is required', {}));
  }

  for (const zone of ast.zones) {
    if (!VALID_ZONES.has(zone.name)) {
      errors.push(createManifoldError('MANIFOLD_UNKNOWN_ZONE', `Unknown zone: ${zone.name}`, { zone: zone.name }));
    }
    if (!ast.materialNames.has(zone.material)) {
      errors.push(createManifoldError('MANIFOLD_UNKNOWN_MATERIAL', `Unknown material: ${zone.material}`, {
        zone: zone.name,
        material: zone.material,
      }));
    }
    if (!zone.listener) {
      errors.push(createManifoldError('MANIFOLD_MISSING_LISTENER', `Zone ${zone.name} has no listener`, { zone: zone.name }));
      continue;
    }
    if (!VALID_EVENTS.has(zone.listener.event)) {
      errors.push(createManifoldError('MANIFOLD_UNKNOWN_EVENT', `Unknown event: ${zone.listener.event}`, {
        event: zone.listener.event,
        allowedEvents: MANIFOLD_EVENTS,
      }));
    }
    if (!isUnit(zone.listener.threshold)) {
      errors.push(createManifoldError('MANIFOLD_THRESHOLD_RANGE', 'Event threshold must be 0..1', {
        zone: zone.name,
        threshold: zone.listener.threshold,
      }));
    }
    for (const action of zone.actions) validateAction(action, zone.name, errors);
  }
}

function validateAction(action, zone, errors) {
  if (action.kind === 'clampFeedback' && (!isUnit(action.max) || action.max > MAX_FEEDBACK)) {
    errors.push(createManifoldError('MANIFOLD_UNSAFE_FEEDBACK', 'Feedback clamp exceeds realtime maximum', {
      zone,
      max: action.max,
      allowedMax: MAX_FEEDBACK,
    }));
  }
  if (action.kind === 'spray') {
    if (!VALID_DIVISIONS.has(action.division)) {
      errors.push(createManifoldError('MANIFOLD_INVALID_DIVISION', 'Spray division is not supported in V1', {
        division: action.division,
      }));
    }
    if (!isUnit(action.density)) {
      errors.push(createManifoldError('MANIFOLD_SPRAY_DENSITY_RANGE', 'Spray density must be 0..1', {
        density: action.density,
      }));
    }
  }
  if ('durationMs' in action && action.durationMs < DEFAULT_SAFETY.minRampMs) {
    errors.push(createManifoldError('MANIFOLD_RAMP_TOO_FAST', 'Parameter ramps must respect minRampMs', {
      durationMs: action.durationMs,
      minRampMs: DEFAULT_SAFETY.minRampMs,
    }));
  }
}

function emitInstructions(ast) {
  const instructions = [];
  for (const zone of ast.zones) {
    instructions.push({
      op: 'MATCH_EVENT',
      event: zone.listener.event,
      threshold: zone.listener.threshold,
    });
    for (const action of zone.actions) {
      if (action.kind === 'morphTo' || action.kind === 'widen') {
        instructions.push({
          op: 'RAMP_PARAM',
          target: action.target,
          value: action.value,
          durationMs: action.durationMs,
        });
      } else if (action.kind === 'morphScale') {
        instructions.push({
          op: 'SCALE_PARAM',
          target: action.target,
          factor: action.factor,
          durationMs: action.durationMs,
        });
      } else if (action.kind === 'clampFeedback') {
        instructions.push({
          op: 'CLAMP_FEEDBACK',
          node: action.node,
          max: action.max,
        });
      } else if (action.kind === 'spray') {
        instructions.push({
          op: 'TRIGGER_SPRAY',
          division: action.division,
          density: action.density,
          durationMs: action.durationMs,
        });
      } else if (action.kind === 'bloom') {
        instructions.push({
          op: 'BLOOM_HARMONIC',
          amount: action.amount,
          durationMs: action.durationMs,
        });
      } else if (action.kind === 'crossfade') {
        instructions.push({
          op: 'CROSSFADE_NODE',
          from: action.from,
          to: action.to,
          durationMs: action.durationMs,
        });
      }
    }
  }
  return instructions;
}

function buildSafetyManifest(instructions) {
  const maxFeedback = instructions
    .filter((instruction) => instruction.op === 'CLAMP_FEEDBACK')
    .reduce((max, instruction) => Math.max(max, instruction.max), DEFAULT_SAFETY.maxFeedback);
  const maxSprayDensity = instructions
    .filter((instruction) => instruction.op === 'TRIGGER_SPRAY')
    .reduce((max, instruction) => Math.max(max, instruction.density), DEFAULT_SAFETY.maxSprayDensity);
  const maxInstructionDuration = instructions
    .filter((instruction) => Number.isFinite(instruction.durationMs))
    .reduce((max, instruction) => Math.max(max, instruction.durationMs), 0);

  return {
    maxFeedback: roundTo(maxFeedback, 2),
    maxFilterQ: DEFAULT_SAFETY.maxFilterQ,
    maxSprayDensity: roundTo(maxSprayDensity, 2),
    maxDelayMs: DEFAULT_SAFETY.maxDelayMs,
    minRampMs: DEFAULT_SAFETY.minRampMs,
    cpuBudgetClass: instructions.length > 12 || maxInstructionDuration > 900 ? 'high' : 'medium',
    requiresLimiter: true,
    hasUnsafeCycles: false,
  };
}

function planDspGraph(ast) {
  return {
    zones: ast.zones.map((zone) => ({
      id: zone.name,
      material: zone.material,
      listensTo: zone.listener?.event ?? null,
      routes: [
        `${zone.name}.wall_filter_bank`,
        `${zone.name}.diffusion_bus`,
        'fdn_core',
        'safety_limiter',
        'output_renderer',
      ],
    })),
    nodes: [
      'input_splitter',
      'early_reflection',
      'fdn_core',
      'wall_filter_bank',
      'micro_delay_spray',
      'resonator_bloom',
      'modulation',
      'safety_limiter',
      'output_renderer',
    ],
  };
}

function normalizeFeatures(features = {}) {
  return {
    rms: unitNumber(features.rms),
    peak: unitNumber(features.peak),
    crestFactor: unitNumber(features.crestFactor),
    spectralCentroid: unitNumber(features.spectralCentroid),
    spectralFlux: unitNumber(features.spectralFlux),
    lowEnergy: unitNumber(features.lowEnergy),
    midEnergy: unitNumber(features.midEnergy),
    highEnergy: unitNumber(features.highEnergy),
    transientSharpness: unitNumber(features.transientSharpness),
    harmonicity: unitNumber(features.harmonicity),
    inputWidth: unitNumber(features.inputWidth),
  };
}

function unitNumber(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function isUnit(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createManifoldError(code, message, context) {
  const category = code.includes('UNSAFE') || code.includes('RANGE') || code.includes('TOO_FAST')
    ? ERROR_CATEGORIES.RANGE
    : ERROR_CATEGORIES.VALUE;
  const errorCode = category === ERROR_CATEGORIES.RANGE
    ? ERROR_CODES.OUT_OF_BOUNDS
    : ERROR_CODES.INVALID_VALUE;
  const error = new BytecodeError(
    category,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.AUDIO_FORGE,
    errorCode,
    { code, message, ...context },
  );
  return {
    code,
    message,
    bytecode: error.bytecode,
    context: error.context,
  };
}

function stableStringify(value) {
  return JSON.stringify(value, (_key, item) => {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      return Object.keys(item).sort().reduce((acc, key) => {
        acc[key] = item[key];
        return acc;
      }, {});
    }
    return item;
  });
}
