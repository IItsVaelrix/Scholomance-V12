import { compileManifoldDsl, MANIFOLD_PRESET_SCHEMA } from './index.js';

export const MANIFOLD_FACTORY_PRESET_SOURCES = Object.freeze([
  {
    slug: 'void-glass',
    name: 'VoidGlass',
    author: 'Scholomance Factory',
    macros: macroDefaults({ scatter: 0.82, fracture: 0.72, gravity: 0.44, bloom: 0.5, wetDry: 0.42 }),
    layout: layoutFor(['floor', 'ceiling', 'rear_wall']),
    dslSource: `manifold VoidGlass {
  clock internal 120

  material crystal {
    scatter 0.8
    brightness 0.7
    diffusion 0.6
  }

  material ash {
    absorption low 0.8
    absorption high 0.3
    diffusion 0.2
  }

  zone floor uses ash {
    listen sub_transient threshold 0.65

    on trigger {
      morph absorption.low to 0.95 in 60ms
      morph decay.low scale 0.40 in 100ms
      clamp feedback max 0.58
    }
  }

  zone ceiling uses crystal {
    listen high_crunch threshold 0.55

    on trigger {
      spray micro_delay division 1/64 density 0.7 duration 180ms
      morph scatter to 0.92 in 30ms
    }
  }

  zone rear_wall uses crystal {
    listen harmonic_sustain threshold 0.5

    on trigger {
      bloom harmonic amount 0.45 duration 600ms
      widen tail to 0.65 in 300ms
    }
  }
}`,
  },
  {
    slug: 'cathedral-of-teeth',
    name: 'Cathedral of Teeth',
    author: 'Scholomance Factory',
    macros: macroDefaults({ size: 0.7, reactivity: 0.62, scatter: 0.58, fracture: 0.35, bloom: 0.72, wetDry: 0.38 }),
    layout: layoutFor(['front_wall', 'ceiling', 'rear_wall']),
    dslSource: `manifold CathedralOfTeeth {
  clock internal 96

  material enamel {
    scatter 0.55
    brightness 0.62
    diffusion 0.74
  }

  material marrow {
    absorption low 0.42
    absorption high 0.18
    diffusion 0.68
  }

  zone front_wall uses marrow {
    listen vocal_presence threshold 0.58

    on trigger {
      bloom harmonic amount 0.38 duration 520ms
      morph scatter to 0.64 in 80ms
      clamp feedback max 0.61
    }
  }

  zone ceiling uses enamel {
    listen high_crunch threshold 0.6

    on trigger {
      spray micro_delay division 1/32 density 0.52 duration 160ms
      morph brightness to 0.74 in 40ms
    }
  }

  zone rear_wall uses enamel {
    listen harmonic_sustain threshold 0.54

    on trigger {
      widen tail to 0.7 in 320ms
    }
  }
}`,
  },
  {
    slug: 'ash-lung',
    name: 'Ash Lung',
    author: 'Scholomance Factory',
    macros: macroDefaults({ size: 0.8, reactivity: 0.5, stability: 0.82, material: 0.46, gravity: 0.68, bloom: 0.64, wetDry: 0.47 }),
    layout: layoutFor(['void_layer', 'floor', 'core']),
    dslSource: `manifold AshLung {
  clock internal 72

  material ash {
    absorption low 0.64
    absorption high 0.52
    diffusion 0.44
  }

  material smoke {
    scatter 0.48
    brightness 0.28
    diffusion 0.78
  }

  zone void_layer uses smoke {
    listen silence_gap threshold 0.7

    on trigger {
      morph decay.low scale 1.28 in 420ms
      widen tail to 0.72 in 500ms
      clamp feedback max 0.6
    }
  }

  zone floor uses ash {
    listen full_spectrum_impact threshold 0.62

    on trigger {
      morph decay.low scale 0.46 in 120ms
      morph absorption.low to 0.86 in 90ms
    }
  }

  zone core uses smoke {
    listen harmonic_sustain threshold 0.52

    on trigger {
      bloom harmonic amount 0.34 duration 700ms
    }
  }
}`,
  },
  {
    slug: 'ice-circuit',
    name: 'Ice Circuit',
    author: 'Scholomance Factory',
    macros: macroDefaults({ size: 0.52, reactivity: 0.74, stability: 0.7, scatter: 0.76, fracture: 0.68, bloom: 0.58, wetDry: 0.4 }),
    layout: layoutFor(['ceiling', 'left_wall', 'right_wall']),
    dslSource: `manifold IceCircuit {
  clock internal 132

  material ice {
    scatter 0.74
    brightness 0.82
    diffusion 0.5
  }

  material copper {
    absorption low 0.32
    absorption high 0.22
    diffusion 0.58
  }

  zone ceiling uses ice {
    listen high_crunch threshold 0.57

    on trigger {
      spray micro_delay division 1/64 density 0.62 duration 140ms
      morph scatter to 0.88 in 30ms
      clamp feedback max 0.56
    }
  }

  zone left_wall uses copper {
    listen sub_transient threshold 0.6

    on trigger {
      morph absorption.low to 0.72 in 80ms
    }
  }

  zone right_wall uses ice {
    listen harmonic_sustain threshold 0.56

    on trigger {
      bloom harmonic amount 0.42 duration 480ms
      widen tail to 0.68 in 260ms
    }
  }
}`,
  },
  {
    slug: 'substrate-maw',
    name: 'Substrate Maw',
    author: 'Scholomance Factory',
    macros: macroDefaults({ size: 0.66, reactivity: 0.78, stability: 0.6, material: 0.35, scatter: 0.4, fracture: 0.48, gravity: 0.9, bloom: 0.36, wetDry: 0.44 }),
    layout: layoutFor(['floor', 'core', 'void_layer']),
    dslSource: `manifold SubstrateMaw {
  clock internal 84

  material basalt {
    absorption low 0.58
    absorption high 0.48
    diffusion 0.36
  }

  material throat {
    scatter 0.34
    brightness 0.22
    diffusion 0.62
  }

  zone floor uses basalt {
    listen sub_transient threshold 0.58

    on trigger {
      morph absorption.low to 0.94 in 70ms
      morph decay.low scale 0.36 in 100ms
      clamp feedback max 0.55
    }
  }

  zone core uses throat {
    listen dense_spectral_cloud threshold 0.62

    on trigger {
      morph scatter to 0.58 in 140ms
      spray micro_delay division 1/32 density 0.36 duration 220ms
    }
  }

  zone void_layer uses throat {
    listen silence_gap threshold 0.76

    on trigger {
      widen tail to 0.54 in 360ms
      bloom harmonic amount 0.24 duration 640ms
    }
  }
}`,
  },
]);

export function buildManifoldFactoryPreset(source) {
  const compiled = compileManifoldDsl(source.dslSource);
  if (!compiled.ok) {
    throw new Error(`Factory preset ${source.slug} failed compile: ${compiled.errors.map((error) => error.code).join(', ')}`);
  }
  return {
    schemaVersion: MANIFOLD_PRESET_SCHEMA,
    name: source.name,
    author: source.author,
    dslSource: source.dslSource,
    bytecode: compiled.program,
    macros: source.macros,
    visualLayout: source.layout,
  };
}

export function getManifoldFactoryPresets() {
  return MANIFOLD_FACTORY_PRESET_SOURCES.map(buildManifoldFactoryPreset);
}

function macroDefaults(overrides = {}) {
  return {
    size: 0.55,
    reactivity: 0.65,
    stability: 0.72,
    material: 0.5,
    scatter: 0.55,
    fracture: 0.35,
    gravity: 0.42,
    bloom: 0.45,
    wetDry: 0.4,
    ...overrides,
  };
}

function layoutFor(zoneIds) {
  const coordinates = {
    floor: { x: 0.5, y: 0.82 },
    ceiling: { x: 0.5, y: 0.18 },
    left_wall: { x: 0.18, y: 0.5 },
    right_wall: { x: 0.82, y: 0.5 },
    front_wall: { x: 0.5, y: 0.36 },
    rear_wall: { x: 0.5, y: 0.64 },
    core: { x: 0.5, y: 0.5 },
    void_layer: { x: 0.5, y: 0.94 },
  };

  return {
    kind: 'manifold.visual-layout.v1',
    zones: zoneIds.map((id) => ({ id, ...coordinates[id] })),
  };
}
