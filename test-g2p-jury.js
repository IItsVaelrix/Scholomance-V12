import { runG2PJury } from './codex/core/phonology/g2p/g2p.adapter.js';

async function test() {
  const result = await runG2PJury('AWKWARDMIND', null, { policy: 'pass' });
  console.log("Jury result for AWKWARDMIND:", JSON.stringify(result, null, 2));
}
test();
