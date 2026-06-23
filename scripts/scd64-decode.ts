import { decodeSCD64Hover } from '../src/core/scd64/decodeSCD64';

const args = process.argv.slice(2);
const checksum = args[0];

if (!checksum) {
  console.error(JSON.stringify({ error: "Usage: tsx scd64-decode.ts <checksum64>" }));
  process.exit(1);
}

try {
  const result = decodeSCD64Hover(checksum);
  console.log(JSON.stringify(result, null, 2));
} catch (e: any) {
  console.error(JSON.stringify({ error: e.message }));
  process.exit(1);
}
