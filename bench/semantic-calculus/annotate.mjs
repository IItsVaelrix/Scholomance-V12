/**
 * Single-keypress annotator — three independent channels (rev 7, P6).
 *
 * One key per item. No Enter, no typing, auto-advance. 200 items in ~4 minutes.
 *
 *   node bench/semantic-calculus/annotate.mjs --as damien
 *   node bench/semantic-calculus/annotate.mjs --as damien --channel warrant
 *   node bench/semantic-calculus/annotate.mjs --as damien --channel justification
 *
 * THREE CHANNELS, ANNOTATED SEPARATELY AND DELIBERATELY SO:
 *
 *   kind           what sort of thing was said
 *   warrant        what could justify treating the conclusion as knowledge
 *   justification  would THESE cites justify THIS conclusion?
 *
 * They are separate passes, not three keys on one screen. Asking all three at
 * once would let each answer anchor the next — you would pick the warrant that
 * suits the kind you just chose, and the channels would stop being independent
 * measurements of independent questions. Their whole value is that
 * kappa_justification can crater while kappa_kind looks healthy.
 *
 * Rev 6 cut Forbidden and Escalate: they were law.decision verdicts, not act
 * types, and asking an annotator to project a permission onto the kind axis is
 * what took kappa to 0.271. Five keys now.
 *
 * Deliberately does NOT show: the other annotator's labels, or `stratum` (design
 * intent). Seeing either would anchor you, and kappa would measure agreement about
 * agreeing rather than whether the kinds are reproducible.
 *
 * Records response time per item. Not surveillance — hesitation is the cheapest
 * signal we have about which boundaries are actually load-bearing, and it costs
 * you nothing to produce. A kind you consistently stall on is a kind in trouble
 * even if you and I end up agreeing on it.
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = join(HERE, 'corpus', 'ui-intents-v0.jsonl');

const C = {
  dim: '\x1b[2m', bold: '\x1b[1m', reset: '\x1b[0m',
  cyan: '\x1b[36m', yellow: '\x1b[33m', green: '\x1b[32m', grey: '\x1b[90m',
  magenta: '\x1b[35m',
};

/**
 * Each channel declares its own keys, legend and prompt. `needs` filters the
 * corpus: justification cannot be asked of an item with no reported conclusion
 * and no cites — there would be nothing to judge, and a forced answer is noise.
 */
const CHANNELS = {
  kind: {
    label: 'kind',
    prompt: 'what sort of thing was said?',
    keys: {
      d: 'Do', c: 'Clarify', p: 'Probe', t: 'Theory', h: 'Hypothesis',
      1: 'Do', 2: 'Clarify', 3: 'Probe', 4: 'Theory', 5: 'Hypothesis',
    },
    legend:
      `${C.bold}d${C.reset} Do        ${C.dim}act now, nothing to ask${C.reset}\n` +
      `  ${C.bold}c${C.reset} Clarify   ${C.dim}one bounded question fixes it${C.reset}\n` +
      `  ${C.bold}p${C.reset} Probe     ${C.dim}read-only, commit nothing${C.reset}\n` +
      `  ${C.bold}t${C.reset} Theory    ${C.dim}the words don't bind${C.reset}\n` +
      `  ${C.bold}h${C.reset} Hypothesis${C.dim} a testable candidate reading${C.reset}\n` +
      `  ${C.grey}u undo   q save+quit   (1-5 also work)${C.reset}\n` +
      `  ${C.grey}permission is NOT this question — 'drop the database' is a Do that LAW blocks${C.reset}`,
    needs: () => true,
  },
  warrant: {
    label: 'warrant',
    prompt: 'what could justify treating the answer as knowledge?',
    keys: {
      l: 'lexicon', o: 'observation', h: 'human', m: 'model', g: 'gene', n: 'none',
      1: 'lexicon', 2: 'observation', 3: 'human', 4: 'model', 5: 'gene', 6: 'none',
    },
    legend:
      `${C.bold}l${C.reset} lexicon     ${C.dim}the vocabulary settles it${C.reset}\n` +
      `  ${C.bold}o${C.reset} observation ${C.dim}only running something would settle it${C.reset}\n` +
      `  ${C.bold}h${C.reset} human       ${C.dim}only a person with authority can settle it${C.reset}\n` +
      `  ${C.bold}m${C.reset} model       ${C.dim}a judgement call, no ground truth to hand${C.reset}\n` +
      `  ${C.bold}g${C.reset} gene        ${C.dim}a declared rule already settles it${C.reset}\n` +
      `  ${C.bold}n${C.reset} none        ${C.dim}nothing available could settle it${C.reset}\n` +
      `  ${C.grey}u undo   q save+quit   (1-6 also work)${C.reset}\n` +
      `  ${C.grey}what WOULD settle it — not what the system happens to cite${C.reset}`,
    needs: () => true,
  },
  justification: {
    label: 'justification',
    prompt: 'would these cites justify that conclusion?',
    keys: { y: 'yes', n: 'no', '?': 'unsure', 1: 'yes', 2: 'no', 3: 'unsure' },
    legend:
      `${C.bold}y${C.reset} yes    ${C.dim}the evidence bears on the claim${C.reset}\n` +
      `  ${C.bold}n${C.reset} no     ${C.dim}decoration — true, present, and irrelevant${C.reset}\n` +
      `  ${C.bold}?${C.reset} unsure ${C.dim}cannot tell from what is shown${C.reset}\n` +
      `  ${C.grey}u undo   q save+quit   (1-3 also work)${C.reset}\n` +
      `  ${C.grey}not "are the cites true" — "do they support THIS conclusion"${C.reset}`,
    /** Nothing to judge without a conclusion and cites to judge it against. */
    needs: (item) => Boolean(item.conclusion && Array.isArray(item.cites) && item.cites.length),
  },
};

function main() {
  const asIdx = process.argv.indexOf('--as');
  const name = asIdx > -1 ? process.argv[asIdx + 1] : null;
  const chIdx = process.argv.indexOf('--channel');
  const channelKey = chIdx > -1 ? process.argv[chIdx + 1] : 'kind';
  const channel = CHANNELS[channelKey];
  if (!name || !channel) {
    console.error('usage: node annotate.mjs --as <yourname> [--channel kind|warrant|justification]');
    process.exit(2);
  }

  const corpusIdx = process.argv.indexOf('--corpus');
  const corpusPath = corpusIdx > -1 ? process.argv[corpusIdx + 1] : CORPUS;

  const outDir = join(HERE, 'labels');
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `${name}.jsonl`);

  /**
   * Labels are keyed by id and MERGED per channel: annotating warrant must not
   * discard the kind labels already in the file, and re-running a channel must
   * not duplicate rows.
   */
  const byId = new Map();
  if (existsSync(out)) {
    for (const line of readFileSync(out, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      byId.set(row.id, row);
    }
  }

  const all = readFileSync(corpusPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const eligible = all.filter((r) => channel.needs(r));
  const queue = eligible.filter((r) => byId.get(r.id)?.[channelKey] === undefined);
  const answered = () => eligible.filter((r) => byId.get(r.id)?.[channelKey] !== undefined).length;

  const save = () =>
    writeFileSync(out, [...byId.values()].map((l) => JSON.stringify(l)).join('\n') + '\n');

  const order = [];

  if (eligible.length === 0) {
    console.log(`\nNo item in ${corpusPath} can carry a "${channelKey}" label.`);
    if (channelKey === 'justification') {
      console.log('justification needs rows with BOTH a `conclusion` and a non-empty `cites`.');
      console.log('Capture Probe reports into a corpus first — there is nothing to judge');
      console.log('about a conclusion that was never drawn.');
    }
    return;
  }

  if (queue.length === 0) {
    console.log(`\nAll ${eligible.length} eligible items already have a "${channelKey}" label -> ${out}`);
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
    const n = answered() + 1;
    const pct = Math.round((n / eligible.length) * 100);
    const filled = Math.round((n / eligible.length) * 40);
    const bar = `${C.green}${'█'.repeat(filled)}${C.grey}${'░'.repeat(40 - filled)}${C.reset}`;

    process.stdout.write('\x1b[2J\x1b[H'); // clear
    process.stdout.write(`${C.dim}Semantic annotation — ${C.reset}${C.magenta}${channelKey}${C.reset}${C.dim} channel — as "${name}"${C.reset}\n\n`);
    process.stdout.write(`  ${bar} ${String(n).padStart(3)}/${eligible.length}  ${pct}%\n\n`);
    process.stdout.write(`  ${channel.legend}\n\n`);
    process.stdout.write(`${C.grey}  ${'─'.repeat(56)}${C.reset}\n\n`);
    process.stdout.write(`   ${C.bold}${C.cyan}${JSON.stringify(item.utterance)}${C.reset}\n\n`);

    // justification needs the conclusion and the cites in front of you — the
    // question is whether THESE bear on THAT, which is unanswerable unseen.
    if (channelKey === 'justification') {
      process.stdout.write(`   ${C.dim}concluded:${C.reset} ${C.bold}${item.conclusion}${C.reset}\n\n`);
      process.stdout.write(`   ${C.dim}citing:${C.reset}\n`);
      for (const cite of item.cites) {
        const text = typeof cite === 'string' ? cite : `${cite.stableId}${cite.whyMatched ? ` — ${cite.whyMatched}` : ''}`;
        process.stdout.write(`     ${C.grey}·${C.reset} ${text}\n`);
      }
      process.stdout.write('\n');
    }

    process.stdout.write(`${C.grey}  ${'─'.repeat(56)}${C.reset}\n\n`);
    process.stdout.write(`  ${C.yellow}${channel.prompt}${C.reset}  ${C.grey}(no wrong answers; if it could be either, that IS the finding)${C.reset}  `);
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
    if (key === '') finish(`${C.dim}Saved ${answered()} ${channelKey} labels -> ${out}${C.reset}`); // ctrl-c

    const k = key.toLowerCase();

    if (k === 'q') {
      finish(
        `${C.green}Saved ${answered()}/${eligible.length} ${channelKey} labels -> ${out}${C.reset}\n` +
        `${C.dim}Rerun the same command to resume exactly where you stopped.${C.reset}`,
      );
      return;
    }

    if (k === 'u') {
      const last = order.pop();
      if (!last) return;
      const row = byId.get(last);
      if (row) delete row[channelKey];
      queue.unshift(eligible.find((r) => r.id === last));
      save();
      draw();
      return;
    }

    const value = channel.keys[k];
    if (!value) return; // ignore stray keys rather than nag

    const id = queue[i].id;
    // Merge, never replace: this file may already hold other channels' labels,
    // and annotating warrant must not silently discard the kind pass.
    const row = byId.get(id) ?? { id };
    row[channelKey] = value;
    if (channelKey === 'kind') row.ms = Date.now() - shown;
    byId.set(id, row);
    order.push(id);
    queue.splice(i, 1);
    save(); // save every keystroke — a crash at item 180 must not cost 180 items

    if (queue.length === 0) {
      const hesitant = [...byId.values()].filter((l) => l.ms > 4000).length;
      const next = channelKey === 'kind' ? 'warrant' : channelKey === 'warrant' ? 'justification' : null;
      finish(
        `${C.green}${C.bold}Done — ${answered()}/${eligible.length} ${channelKey} labels.${C.reset}\n` +
        (channelKey === 'kind'
          ? `${C.dim}You hesitated (>4s) on ${hesitant}. Those are where the taxonomy is soft.${C.reset}\n`
          : '') +
        (next
          ? `\n${C.dim}Next channel (they are separate passes on purpose — answering all three${C.reset}\n` +
            `${C.dim}at once would let each answer anchor the next):${C.reset}\n` +
            `  ${C.bold}node bench/semantic-calculus/annotate.mjs --as ${name} --channel ${next}${C.reset}\n`
          : '') +
        `\nThen:\n  ${C.bold}node bench/semantic-calculus/kappa.mjs \\\n    bench/semantic-calculus/labels/claude.jsonl \\\n    ${out}${C.reset}\n`,
      );
      return;
    }
    draw();
  });

  draw();
}

main();
