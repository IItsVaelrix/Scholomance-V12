#!/usr/bin/env node
/**
 * CLERI PROBE — Pronunciation / Homograph Edition
 *
 * Baseline: how accurately does context-free G2P pronounce homographs?
 * `analyzeDeep(word)` takes no context, so it returns ONE fixed pronunciation
 * per word. On a balanced homograph set it can satisfy at most one sense per
 * word. This probe quantifies that ceiling and names the bad defaults — the
 * exact cases a context-aware disambiguator must fix.
 *
 * Comparison is on the primary-stress signature {vowel, position}, which is the
 * feature that actually distinguishes vowel-change and stress-shift homographs.
 */
import { PhonemeEngine } from '../codex/core/phonology/phoneme.engine.js';

const VOWELS = new Set(['AA','AE','AH','AO','AW','AY','EH','ER','EY','IH','IY','OW','OY','UH','UW']);

const HOMOGRAPHS = [
  { word: 'read',     senses: [
    { sense: 'present', context: 'I read books every day', vowel: 'IY', pos: 0 },
    { sense: 'past',    context: 'I read it yesterday',     vowel: 'EH', pos: 0 } ] },
  { word: 'lead',     senses: [
    { sense: 'verb',    context: 'lead the team forward',   vowel: 'IY', pos: 0 },
    { sense: 'metal',   context: 'pipes made of lead',      vowel: 'EH', pos: 0 } ] },
  { word: 'live',     senses: [
    { sense: 'verb',    context: 'I live in Ohio',          vowel: 'IH', pos: 0 },
    { sense: 'adj',     context: 'a live show tonight',     vowel: 'AY', pos: 0 } ] },
  { word: 'bow',      senses: [
    { sense: 'bend',    context: 'take a bow on stage',     vowel: 'AW', pos: 0 },
    { sense: 'knot',    context: 'tie a bow on the gift',   vowel: 'OW', pos: 0 } ] },
  { word: 'tear',     senses: [
    { sense: 'rip',     context: 'tear the paper in half',  vowel: 'EH', pos: 0 },
    { sense: 'cry',     context: 'a tear ran down',         vowel: 'IH', pos: 0 } ] },
  { word: 'wind',     senses: [
    { sense: 'air',     context: 'the wind blew hard',      vowel: 'IH', pos: 0 },
    { sense: 'turn',    context: 'wind the old clock',      vowel: 'AY', pos: 0 } ] },
  { word: 'record',   senses: [
    { sense: 'noun',    context: 'she set a new record',    vowel: 'EH', pos: 0 },
    { sense: 'verb',    context: 'record the show tonight', vowel: 'AO', pos: 1 } ] },
  { word: 'present',  senses: [
    { sense: 'noun',    context: 'a birthday present',      vowel: 'EH', pos: 0 },
    { sense: 'verb',    context: 'present the plan today',  vowel: 'EH', pos: 1 } ] },
  { word: 'object',   senses: [
    { sense: 'noun',    context: 'a strange object',        vowel: 'AA', pos: 0 },
    { sense: 'verb',    context: 'I object to that',        vowel: 'EH', pos: 1 } ] },
  { word: 'produce',  senses: [
    { sense: 'noun',    context: 'fresh produce aisle',     vowel: 'OW', pos: 0 },
    { sense: 'verb',    context: 'produce better results',  vowel: 'UW', pos: 1 } ] },
  { word: 'contract', senses: [
    { sense: 'noun',    context: 'sign the contract',       vowel: 'AA', pos: 0 },
    { sense: 'verb',    context: 'muscles contract',        vowel: 'AE', pos: 1 } ] },
  { word: 'desert',   senses: [
    { sense: 'noun',    context: 'the Sahara desert',       vowel: 'EH', pos: 0 },
    { sense: 'verb',    context: 'desert the post',         vowel: 'ER', pos: 1 } ] },
];

function stressSignature(phonemes) {
  if (!Array.isArray(phonemes)) return null;
  const vowelTokens = phonemes.filter(p => VOWELS.has(p.replace(/[0-9]/g, '')));
  if (vowelTokens.length === 0) return null;
  let pos = vowelTokens.findIndex(v => /1$/.test(v));
  if (pos === -1) pos = 0; // no explicit primary stress → assume first vowel
  return { vowel: vowelTokens[pos].replace(/[0-9]/g, ''), pos };
}

function sigEq(a, b) { return !!a && !!b && a.vowel === b.vowel && a.pos === b.pos; }

async function main() {
  console.log('[probe] CLERI PROBE — Pronunciation / Homograph Edition\n');
  await PhonemeEngine.init();

  let correct = 0;
  let total = 0;
  const failures = [];

  console.log('[probe] PER-WORD (engine is context-free → one fixed output per word)');
  for (const h of HOMOGRAPHS) {
    const out = PhonemeEngine.analyzeDeep(h.word)?.phonemes || [];
    const sig = stressSignature(out);
    const matched = h.senses.find(s => sigEq(sig, s));
    console.log(
      `  ${h.word.padEnd(9)} ${out.join(' ').padEnd(22)} sig=${sig ? sig.vowel + '@' + sig.pos : '—'}  default=${matched ? matched.sense : 'NEITHER'}`,
    );
    for (const s of h.senses) {
      total += 1;
      if (sigEq(sig, s)) {
        correct += 1;
      } else {
        failures.push(`${h.word} (${s.sense}) "${s.context}" — wanted ${s.vowel}@${s.pos}, got ${sig ? sig.vowel + '@' + sig.pos : '—'}`);
      }
    }
  }

  const acc = (correct / total) * 100;
  console.log(`\n[probe] BASELINE HOMOGRAPH ACCURACY: ${correct}/${total} = ${acc.toFixed(1)}%`);
  console.log('[probe] (context-free ceiling: a fixed pronunciation can satisfy at most one sense per word)\n');

  console.log('[probe] FAILURES — what context-aware disambiguation must fix:');
  failures.forEach(f => console.log('  ✗ ' + f));

  console.log('\n[probe] VERDICT');
  console.log(`  ${acc.toFixed(0)}% baseline. Ceiling is structural: analyzeDeep(word) has no context parameter.`);
  console.log('  → Target: context-aware path + homograph policy to lift this toward 90%+.');
  console.log('\n[probe] pronunciation probe complete.');
}

main();
