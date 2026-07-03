#!/usr/bin/env node
/**
 * SCDL CLI
 *
 * Usage:
 *   node scdl.cli.js compile <file.scdl> [--export json,svg,phaser] [--out <file>]
 *   node scdl.cli.js parse   <file.scdl> [--out <file>]
 *   node scdl.cli.js check   <file.scdl>
 *
 * Examples:
 *   node scdl.cli.js compile fixtures/void_chestplate.scdl --export json,svg,phaser
 *   node scdl.cli.js parse   fixtures/void_chestplate.scdl
 *   node scdl.cli.js check   fixtures/void_chestplate.scdl
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname, extname, join } from 'node:path';
import { compileSCDL, parseSCDL, exportSCDL } from './index.js';
import { buildSCDLDiagnosticReport, formatSCDLDiagnostic } from './scdl.diagnostics.js';

const [,, command, ...argv] = process.argv;

function parseArgs(args) {
  const opts = { flags: {}, positional: [] };
  let i = 0;
  while (i < args.length) {
    if (args[i].startsWith('--')) {
      opts.flags[args[i].slice(2)] = args[i + 1] || true;
      i += 2;
    } else {
      opts.positional.push(args[i]);
      i++;
    }
  }
  return opts;
}

function readSource(filePath) {
  try {
    return readFileSync(resolve(filePath), 'utf8');
  } catch (e) {
    console.error(`[SCDL] Cannot read file: ${filePath}\n${e.message}`);
    process.exit(1);
  }
}

function writeOut(outPath, content) {
  try {
    if (typeof content === 'string') {
      writeFileSync(resolve(outPath), content, 'utf8');
    } else {
      writeFileSync(resolve(outPath), content);
    }
    console.log(`[SCDL] Written: ${outPath}`);
  } catch (e) {
    console.error(`[SCDL] Cannot write: ${outPath}\n${e.message}`);
    process.exit(1);
  }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

function cmdCompile(args) {
  const opts = parseArgs(args);
  const filePath = opts.positional[0];
  if (!filePath) { console.error('[SCDL] compile: missing <file.scdl>'); process.exit(1); }

  const source  = readSource(filePath);
  const targets = (opts.flags.export || 'json').split(',').map(s => s.trim());
  const outPath = opts.flags.out || null;

  console.log(`[SCDL] Compiling: ${filePath}`);
  const result = compileSCDL(source);

  if (!result.ok) {
    console.error(`[SCDL] Compile FAILED (${result.errors.length} error(s)):`);
    for (const err of result.errors) {
      if (err.isError && err.isError()) console.error('  ' + formatSCDLDiagnostic(err));
    }
    process.exit(1);
  }

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      if (err.isWarn && err.isWarn()) console.warn('  WARN: ' + err.message);
    }
  }

  const exports = exportSCDL(result.packet, targets, result.ast);
  for (const [target, out] of Object.entries(exports)) {
    if (!out.ok) {
      console.warn(`  [WARN] Export '${target}' failed: ${out.output}`);
      continue;
    }
    const name = basename(filePath, '.scdl');
    const dest = _targetPath({ outPath, sourceName: name, target, multi: targets.length > 1 });
    writeOut(dest, out.output instanceof Uint8Array ? out.output : String(out.output));
  }

  console.log(`[SCDL] Done. Packet ID: ${result.packet.id}`);
}

function cmdParse(args) {
  const opts    = parseArgs(args);
  const filePath = opts.positional[0];
  if (!filePath) { console.error('[SCDL] parse: missing <file.scdl>'); process.exit(1); }

  const source = readSource(filePath);
  const result = parseSCDL(source);
  const out    = JSON.stringify(result.rawAst || result, null, 2);

  if (opts.flags.out) {
    writeOut(opts.flags.out, out);
  } else {
    console.log(out);
  }

  if (result.errors.length) {
    console.warn(`[SCDL] Parse warnings: ${result.errors.length}`);
  }
}

function cmdCheck(args) {
  const opts    = parseArgs(args);
  const filePath = opts.positional[0];
  if (!filePath) { console.error('[SCDL] check: missing <file.scdl>'); process.exit(1); }

  const source = readSource(filePath);
  const result = compileSCDL(source);
  const report = buildSCDLDiagnosticReport(result);

  console.log(`[SCDL] Check: ${filePath}`);
  console.log(`  OK:     ${result.ok}`);
  console.log(`  Errors: ${report.summary.errors}`);
  console.log(`  Warns:  ${report.summary.warns}`);
  console.log(`  Infos:  ${report.summary.infos}`);

  for (const err of result.errors) {
    if (err.isError && err.isError()) {
      console.error('  ERROR: ' + formatSCDLDiagnostic(err));
    } else if (err.isWarn && err.isWarn()) {
      console.warn('  WARN:  ' + formatSCDLDiagnostic(err));
    } else {
      console.log('  INFO:  ' + formatSCDLDiagnostic(err));
    }
  }

  if (result.ok) {
    console.log(`  Packet: ${result.packet?.id}`);
    console.log(`  Coords: ${result.packet?.geometry?.coordinates?.length ?? 0}`);
  }

  process.exit(result.ok ? 0 : 1);
}

function _targetExt(target) {
  switch (target) {
    case 'svg': return 'svg';
    case 'png': return 'png';
    default:    return 'json';
  }
}

function _targetPath({ outPath, sourceName, target, multi }) {
  const ext = _targetExt(target);
  if (!outPath) {
    return multi ? `${sourceName}-${target}.${ext}` : `${sourceName}.${ext}`;
  }
  if (!multi) return outPath;

  const dir = dirname(outPath);
  const file = basename(outPath);
  const suffix = extname(file);
  const stem = suffix ? file.slice(0, -suffix.length) : file;
  return join(dir, `${stem}-${target}.${ext}`);
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

switch (command) {
  case 'compile': cmdCompile(argv); break;
  case 'parse':   cmdParse(argv);   break;
  case 'check':   cmdCheck(argv);   break;
  default:
    console.log(`SCDL Compiler CLI
Usage:
  node scdl.cli.js compile <file.scdl> [--export json,svg,phaser] [--out <file>]
  node scdl.cli.js parse   <file.scdl> [--out <file>]
  node scdl.cli.js check   <file.scdl>
`);
}
