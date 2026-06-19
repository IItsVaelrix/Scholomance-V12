import { readFileSync } from 'node:fs';
import { decodeAsepriteBinary } from '../codex/core/pixelbrain/aseprite-binary-codec.js';

const buf = readFileSync('output/foundry/starbound-esper-chibi/starbound-esper-chibi.aseprite');
const data = decodeAsepriteBinary(new Uint8Array(buf));
console.log(`Canvas: ${data.width}x${data.height}`);
console.log(`Frames: ${data.frames.length}`);
console.log(`Layers: ${data.frames[0].layers.map(l => l.name).join(', ')}`);
