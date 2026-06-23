import { SpatialImmuneOrchestrator, registerBugFamily } from '../../codex/core/immunity/spatial-immune-orchestrator.js';
import readline from 'readline';

// Register DivTube-specific Bug Families
registerBugFamily('TURBOQUANT_CACHE_GHOST', {
  versionByte: '06',
  domain: 'SCORING',
  description: 'TurboQuant calibration cache is invalidated but not forced to save the registry, causing stale vectors on restart.',
  canonicals: [
    { slot: 'BUGCLASS',  canonical: 'BUGCLASS:TURBOQUANT_CACHE_GHOST:calibration-cache-invalidation-without-persistence' },
    { slot: 'COORDSYS',  canonical: 'COORDSYS:invalidateCalibration-vs-saveRegistry' },
    { slot: 'INVARIANT', canonical: 'INVARIANT:registry-must-sync-on-calibration-drop' },
    { slot: 'MAGNITUDE', canonical: 'MAGNITUDE:stale-vectors>0' },
    { slot: 'MASKING',   canonical: 'MASKING:process-restart-masks-memory-state' },
    { slot: 'GATE',      canonical: 'GATE:calibration-dropped-true' },
    { slot: 'PROPAGATE', point: 'PROPAGATE:turboquant-to-tui-to-user' },
    { slot: 'VERDICT',   canonical: 'VERDICT:auto-heal+sync-registry' },
  ],
  evidenceFiles: ['divtube_downloader/turboquant_plugin.js'],
  legacyPatterns: [/function invalidateCalibration\(\) \{ _calib = null; \}/],
  fixPatterns: [/function invalidateCalibration\(\) { _calib = null; saveRegistry\(\); }/],
  equations: [
    { name: 'Cache Drift', symbol: 'CD', formula: 'CD = _calib === null && !registrySaved' }
  ]
});

const orchestrator = new SpatialImmuneOrchestrator({ sizeX: 32, sizeY: 32, sizeZ: 32, agentCount: 5 });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.type === 'INJECT_EXOSOME') {
      orchestrator.injectRuntimeExosome({
        checksum: msg.id,
        moduleId: msg.source,
        timestamp: Date.now(),
        context: {
          symptoms: msg.symptoms,
          errorMessage: msg.error
        }
      });
      console.log(JSON.stringify({ type: 'ACK', id: msg.id }));
    } else if (msg.type === 'TICK') {
      const diagnostics = orchestrator.tick();
      const state = {
        dimensions: { x: orchestrator.sizeX, y: orchestrator.sizeY, z: orchestrator.sizeZ },
        agents: orchestrator.agents,
        seeds: Array.from(orchestrator.seeds.entries()).map(([id, s]) => ({ id, x: s.x, y: s.y, z: s.z, type: s.type }))
      };
      console.log(JSON.stringify({ type: 'TICK_RESULT', diagnostics, state }));
    } else if (msg.type === 'HEAL') {
      const result = orchestrator.autoHeal(msg.family);
      console.log(JSON.stringify({ type: 'HEAL_RESULT', result, family: msg.family }));
    } else if (msg.type === 'DIAGNOSE') {
      const scd64 = orchestrator.generateSCD64ForFamily(msg.family, {}, {}, {});
      console.log(JSON.stringify({ type: 'DIAGNOSTIC_RESULT', scd64 }));
    }
  } catch (err) {
    console.error(JSON.stringify({ type: 'ERROR', message: err.message }));
  }
});
