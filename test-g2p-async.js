import { runG2PJury } from './codex/core/phonology/g2p/g2p.adapter.js';

async function test() {
  const resultA = await runG2PJury("FALLSINLINE", null, { policy: 'pass' });
  console.log("FALLSINLINE:", resultA.verdict);

  const resultB = await runG2PJury("AWKWARDMIND", null, { policy: 'pass' });
  console.log("AWKWARDMIND:", resultB.verdict);
}

test().catch(console.error);
