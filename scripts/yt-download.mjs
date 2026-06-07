import process from 'node:process';
import { executeDoctor, executeInfo, executeDownload, executeThumbnail } from '../src/tools/youtube-downloader/ytdl.command-map.js';

function parseArgs(argv) {
  const [mode, ...rest] = argv;
  const args = { mode };

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];

    if (token === '--i-have-rights') {
      args.iHaveRights = true;
      continue;
    }

    if (token.startsWith('--')) {
      const key = token.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      args[key] = rest[i + 1];
      i += 1;
    }
  }

  return args;
}

async function run() {
  const args = parseArgs(process.argv.slice(2));

  let result;
  switch (args.mode) {
    case 'doctor':
      result = await executeDoctor(args);
      break;
    case 'info':
      result = await executeInfo(args);
      break;
    case 'thumbnail':
      result = await executeThumbnail(args);
      break;
    case 'download':
    case 'audio':
      result = await executeDownload(args);
      break;
    default:
      console.error(JSON.stringify({ ok: false, error: `Unknown mode: ${args.mode}` }, null, 2));
      process.exitCode = 1;
      return;
  }

  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  if (error.name === 'YtdlError') {
    console.error(JSON.stringify({ ok: false, error: error.toJSON() }, null, 2));
  } else {
    console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  }
  process.exitCode = 1;
});
