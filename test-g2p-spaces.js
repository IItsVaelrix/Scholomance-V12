import { runG2PJury } from './codex/core/phonology/g2p/g2p.adapter.js';

async function test() {
  const result = await runG2PJury("FALLS IN LINE");
  console.log(result.verdict);
}

test().catch(console.error);
