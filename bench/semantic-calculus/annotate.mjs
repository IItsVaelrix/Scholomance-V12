/**
 * Phase 0.5 — single-keypress kind annotator.
 *
 * One key per item. No Enter, no typing, auto-advance. 200 items in ~4 minutes.
 *
 * Deliberately does NOT show: the other annotator's labels, or `stratum` (design
 * intent). Seeing either would anchor you, and kappa would measure agreement about
 * agreeing rather than whether the kinds are reproducible.
 *
 * Records response time per item. Not surveillance — hesitation is the cheapest
 * signal we have about which boundaries are actually load-bearing, and it costs
 * you nothing to produce. A kind you consistently stall on is a kind in trouble
 * even if you and I end up agreeing on it.
 *
 *   node bench/semantic-calculus/annotate.mjs --as damien
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'corpus', 'ui-intents-v0.jsonl');

// Mnemonic letters; digits 1-7 work too if you'd rather drum than think.
const KEYS = {
  d: 'Do', c: 'Clarify', p: 'Probe', f: 'Forbidden',
  e: 'Escalate', t: 'Theory', h: 'Hypothesis',
  1: 'Do', 2: 'Clarify', 3: 'Probe', 4: 'Forbidden',
  5: 'Escalate', 6: 'Theory', 7: 'Hypothesis',
};

const C = {
  dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
  cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', grey: '\x1b[90m',
};

const LEGEND =
  `${C.bold}d${C.reset} Do        ${C.dim}act now, nothing to ask${C.reset}\n` +
  `  ${C.bold}c${C.reset} Clarify   ${C.dim}one bounded question fixes it${C.reset}\n` +
  `  ${C.bold}p${C.reset} Probe     ${C.dim}read-only, commit nothing${C.reset}\n` +
  `  ${C.bold}f${C.reset} Forbidden ${C.dim}blocked outright${C.reset}\n` +
  `  ${C.bold}e${C.reset} Escalate  ${C.dim}a human with authority decides${C.reset}\n` +
  `  ${C.bold}t${C.reset} Theory    ${C.dim}the words don't bind${C.reset}\n` +
  `  ${C.bold}h${C.reset} Hypothesis${C.dim} a testable candidate reading${C.reset}\n` +
  `  ${C.grey}u undo   q save+quit   (1-7 also work)${C.reset}`;

function main() {
  const asIdx = process.argv.indexOf('--as');
  const name = asIdx > -1 ? process.argv[asIdx + 1] : null;
  if (!name) {
    console.error('usage: node annotate.mjs --as <yourname>');
    process.exit(2);
  }

  const outDir = join(HERE, 'labels');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${name}.jsonl`);

  const labels = [];
  if (existsSync(out)) {
    for (const line of readFileSync(out, 'utf8').split('\n')) {
      if (line.trim()) labels.push(JSON.parse(line));
    }
  }
  const done = new Set(labels.map((l) => l.id));

  const all = readFileSync(CORPUS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const queue = all.filter((r) => !done.has(r.id));

  const save = () => writeFileSync(out, labels.map((l) => JSON.stringify(l)).join('\n') + '\n');

  if (queue.length === 0) {
    console.log(`\nAll ${labels.length} items already labelled -> ${out}`);
    console.log(`\nNow run:\n  node bench/semantic-calculus/kappa.mjs \\\n    bench/semantic-calculus/labels/claude.jsonl \\\n    ${out}\n`);
    return;
  }

  if (!process.stdin.isTTY) {
    console.error('needs a TTY (single-keypress mode). Run it directly in your terminal.');
    process.exit(2);
  }

  let i = 0;
  let shown = 0;
  const draw = () => {
    const item = queue[i];
    const n = labels.length + 1;
    const pct = Math.round((n / all.length) * 100);
    const filled = Math.round((n / all.length) * 40);
    const bar = `${C.green}${'█'.repeat(filled)}${C.grey}${'░'.repeat(40 - filled)}${C.reset}`;

    process.stdout.write('\x1b[2J\x1b[H'); // clear
    process.stdout.write(`${C.dim}Phase 0.5 — kind annotation — as "${name}"${C.reset}\n\n`);
    process.stdout.write(`  ${bar} ${String(n).padStart(3)}/${all.length}  ${pct}%\n\n`);
    process.stdout.write(`  ${LEGEND}\n\n`);
    process.stdout.write(`${C.grey}  ${'─'.repeat(56)}${C.reset}\n\n`);
    process.stdout.write(`   ${C.bold}${C.cyan}${JSON.stringify(item.utterance)}${C.reset}\n\n`);
    process.stdout.write(`${C.grey}  ${'─'.repeat(56)}${C.reset}\n\n`);
    process.stdout.write(`  ${C.yellow}first honest read — press a key${C.reset}  ${C.grey}(no wrong answers; if it could be either, that IS the finding)${C.reset}  `);
    shown = Date.now();
  };

  const finish = (msg) => {
    save();
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write(`\x1b[2J\x1b[H${msg}\n`);
    process.exit(0);
  };

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (key) => {
    if (key === '') finish(`${C.dim}Saved ${labels.length} labels -> ${out}${C.reset}`); // ctrl-c

    const k = key.toLowerCase();

    if (k === 'q') {
      finish(
        `${C.green}Saved ${labels.length}/${all.length} -> ${out}${C.reset}\n` +
        `${C.dim}Rerun the same command to resume exactly where you stopped.${C.reset}`,
      );
      return;
    }

    if (k === 'u') {
      if (labels.length === 0) return;
      const undone = labels.pop();
      queue.unshift(all.find((r) => r.id === undone.id));
      save();
      draw();
      return;
    }

    const kind = KEYS[k];
    if (!kind) return; // ignore stray keys rather than nag

    labels.push({ id: queue[i].id, kind, ms: Date.now() - shown });
    queue.splice(i, 1);
    save(); // save every keystroke — a crash at item 180 must not cost 180 items

    if (queue.length === 0) {
      const hesitant = labels.filter((l) => l.ms > 4000).length;
      finish(
        `${C.green}${C.bold}Done — ${labels.length}/${all.length} labelled.${C.reset}\n` +
        `${C.dim}You hesitated (>4s) on ${hesitant}. Those are where the taxonomy is soft.${C.reset}\n\n` +
        `Now run:\n  ${C.bold}node bench/semantic-calculus/kappa.mjs \\\n    bench/semantic-calculus/labels/claude.jsonl \\\n    ${out}${C.reset}\n`,
      );
      return;
    }
    draw();
  });

  draw();
}

main();
