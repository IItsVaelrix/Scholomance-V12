#!/usr/bin/env node
/**
 * Lexical Graph ops CLI — additive overlay for scholomance_dict.sqlite.
 *
 *   node scripts/lexical-graph.mjs migrate --db <path> --timestamp <ISO8601>
 *   node scripts/lexical-graph.mjs mirror --db <path> --timestamp <ISO8601>
 *   node scripts/lexical-graph.mjs seed-devices --db <path> --timestamp <ISO8601>
 *   node scripts/lexical-graph.mjs embed-devices --db <path> --timestamp <ISO8601>
 *   node scripts/lexical-graph.mjs all --db <path> --timestamp <ISO8601>
 *
 * `--timestamp` is required for every write command (no system-clock reads
 * for stamped fields). Each command runs in its own transaction.
 *
 * See: docs/superpowers/specs/2026-07-18-lexical-graph-foundation-design.md
 */

import Database from 'better-sqlite3';
import { migrateLexicalGraph } from '../codex/core/lexical-graph/migrate.js';
import { mirrorEntries } from '../codex/core/lexical-graph/mirror.js';
import { seedLiteraryDevices } from '../codex/core/lexical-graph/seedDevices.js';

const USAGE = `usage: node scripts/lexical-graph.mjs <command> --db <path> --timestamp <ISO8601>

Commands:
  migrate         Create the lexical-graph overlay tables (idempotent)
  mirror           Mirror legacy \`entry\` rows into \`lexical_entry\` (idempotent)
  seed-devices     Seed the curated literary-device catalog (idempotent)
  embed-devices    [not yet implemented]
  all              [not yet implemented]
`;

/**
 * @param {string[]} argv
 * @returns {{ command: string|null, options: { db: string|null, timestamp: string|null } }}
 */
export function parseArgs(argv) {
  const [command = null, ...rest] = argv;
  const options = { db: null, timestamp: null };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === '--db') {
      options.db = rest[i + 1] ?? null;
      i += 1;
    } else if (arg === '--timestamp') {
      options.timestamp = rest[i + 1] ?? null;
      i += 1;
    } else if (arg.startsWith('--db=')) {
      options.db = arg.slice('--db='.length);
    } else if (arg.startsWith('--timestamp=')) {
      options.timestamp = arg.slice('--timestamp='.length);
    }
  }

  return { command, options };
}

const WRITE_COMMANDS = new Set(['migrate', 'mirror', 'seed-devices', 'embed-devices', 'all']);
const NOT_YET_IMPLEMENTED = new Set(['embed-devices', 'all']);

export async function runCli(argv) {
  const { command, options } = parseArgs(argv);

  if (!command) {
    console.error(USAGE);
    return 2;
  }

  if (!WRITE_COMMANDS.has(command)) {
    console.error(`Unknown command: ${command}\n\n${USAGE}`);
    return 2;
  }

  if (!options.db) {
    console.error('Missing required --db <path>\n\n' + USAGE);
    return 2;
  }

  if (!options.timestamp || !options.timestamp.trim()) {
    console.error('Missing required --timestamp <ISO8601>\n\n' + USAGE);
    return 2;
  }

  if (NOT_YET_IMPLEMENTED.has(command)) {
    console.error(`Command "${command}" is not implemented yet in this slice.`);
    return 1;
  }

  const db = new Database(options.db);
  try {
    if (command === 'migrate') {
      migrateLexicalGraph(db, { timestamp: options.timestamp });
      console.log(`lexical-graph migrate: overlay ready on ${options.db}`);
      return 0;
    }
    if (command === 'mirror') {
      const { mirrored } = mirrorEntries(db, { timestamp: options.timestamp });
      console.log(`lexical-graph mirror: mirrored ${mirrored} entries on ${options.db}`);
      return 0;
    }
    if (command === 'seed-devices') {
      const { seeded } = seedLiteraryDevices(db, { timestamp: options.timestamp });
      console.log(`lexical-graph seed-devices: seeded ${seeded} devices on ${options.db}`);
      return 0;
    }
    console.error(`Unhandled command: ${command}`);
    return 1;
  } finally {
    db.close();
  }
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1];
if (isMain) {
  runCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
