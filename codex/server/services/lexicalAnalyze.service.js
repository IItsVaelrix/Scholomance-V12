// Read-only composition of the Analyze result groups. No DB access of its own —
// words come from lexiconAdapter, devices from lexicalGraphAdapter (honesty law:
// a group with no rows returns { items: [], emptyReason }; loose rows carry derived:true).

const GROUP_ORDER = [
  ['meaning', 'Meaning'],
  ['related', 'Related language'],
  ['oppositions', 'Oppositions'],
  ['sound', 'Sound'],
  ['phrases', 'Phrases'],
  ['literary', 'Literary techniques'],
  ['symbols', 'Symbols'],
  ['corpus', 'Corpus examples'],
];

const canonical = (q) => String(q || '').trim().toLowerCase();

function group(key, label, items, emptyReason) {
  const list = items.filter(Boolean);
  if (list.length === 0) return { key, label, items: [], emptyReason: emptyReason || 'No results in the graph yet.' };
  return { key, label, items: list };
}

export function createLexicalAnalyzeService({ lexiconAdapter, lexicalGraphAdapter }) {
  // lexiconAdapter.lookupWord(word) returns an ARRAY of entries (headword_lower
  // is not unique in the schema, though in practice this DB has one row per
  // headword) — never a single entry object. Each entry's senses are objects
  // with `glosses`/`examples` string arrays (confirmed against entry.senses_json
  // for "dark"/"rose"), so per-sense field access matches the brief as written;
  // only the outer entry-vs-array wrapper needed adjusting.
  function meaning(word) {
    const entries = lexiconAdapter.lookupWord(word);
    const primary = entries[0] || null;
    const glosses = entries
      .flatMap((e) => (Array.isArray(e?.senses) ? e.senses : []))
      .flatMap((s) => (Array.isArray(s?.glosses) ? s.glosses : []))
      .slice(0, 8);
    return group('meaning', 'Meaning', glosses.map((g) => ({
      text: g, source: 'entry:gloss', sourceUrl: primary?.sourceUrl, confidence: 0.9,
      ref: primary ? { kind: 'word', id: String(primary.id) } : undefined,
    })), 'No dictionary entry found.');
  }
  function related(word) {
    const syn = lexiconAdapter.lookupSynonyms(word, 12)
      .map((w) => ({ text: w, source: 'wordnet:synonym', confidence: 0.8, ref: { kind: 'word', id: w } }));
    const rel = lexiconAdapter.lookupRelated(word, 10);
    const broader = rel.broader.map((w) => ({ text: w, source: 'wordnet:hypernym', confidence: 0.7, note: 'broader', ref: { kind: 'word', id: w } }));
    const narrower = rel.narrower.map((w) => ({ text: w, source: 'wordnet:hyponym', confidence: 0.7, note: 'narrower', ref: { kind: 'word', id: w } }));
    const akin = rel.akin.map((w) => ({ text: w, source: 'wordnet:similar', confidence: 0.65, note: 'akin', ref: { kind: 'word', id: w } }));
    return group('related', 'Related language', [...syn, ...akin, ...broader, ...narrower], 'No related words found.');
  }
  function oppositions(word) {
    const ant = lexiconAdapter.lookupAntonyms(word, 12)
      .map((w) => ({ text: w, source: 'wordnet:antonym', confidence: 0.8, ref: { kind: 'word', id: w } }));
    return group('oppositions', 'Oppositions', ant, 'No antonym source ingested yet.');
  }
  function sound(word) {
    const r = lexiconAdapter.lookupRhymes(word, 14);
    const perfect = (r.words || []).map((w) => ({ text: w, source: 'rhyme_index', confidence: 0.9, note: r.family || undefined, ref: { kind: 'word', id: w } }));
    // lexiconAdapter.lookupSlantRhymes returns an array of plain word_lower
    // strings (see rhymeIndex.lookupSlantRhymes merge loop) — never objects —
    // so the brief's `typeof w === 'string' ? w : w.word` guard is dropped.
    const slant = (lexiconAdapter.lookupSlantRhymes(word, 10) || [])
      .map((w) => ({ text: w, source: 'rhyme_index:slant', confidence: 0.6, derived: true, note: 'slant' }));
    return group('sound', 'Sound', [...perfect, ...slant], 'No rhymes found.');
  }
  function phrases() {
    return group('phrases', 'Phrases', [], 'Phrase ingest not yet available.');
  }
  // lexicalGraphAdapter.searchFts(...) rows go through toLexicalEntry: the
  // device's name lands in `canonicalText`, and its definition is wrapped as
  // `definitions: [{ text }]` (see seedDevices.js upsertEntry) — there is no
  // `d.name`/`d.definition`/`d.slug` on this shape. The listLiteraryDevices(...)
  // fallback instead runs each row through getLiteraryDevice -> toLiteraryDeviceShell,
  // which DOES carry `name` and a singular `definition` string. Both branches are
  // handled explicitly below rather than guessing one shared field name.
  function literary(word) {
    const page = lexicalGraphAdapter.searchFts(word, { types: ['device'], limit: 8 });
    let devices = page.results || [];
    let viaCatalog = false;
    if (devices.length === 0) {
      devices = (lexicalGraphAdapter.listLiteraryDevices({ limit: 6 }).results || []);
      viaCatalog = true;
    }
    const items = devices.map((d) => {
      const text = viaCatalog ? (d.name || d.id) : (d.canonicalText || d.id);
      const definitionText = viaCatalog
        ? d.definition
        : (Array.isArray(d.definitions) ? d.definitions[0]?.text : undefined);
      return {
        text, source: 'device', confidence: 0.85,
        ref: { kind: 'device', id: String(d.id) },
        note: definitionText ? String(definitionText).slice(0, 120) : undefined,
      };
    });
    return group('literary', 'Literary techniques', items, 'Device overlay not migrated.');
  }
  function symbols(word) {
    const rows = lexiconAdapter.lookupSymbolsLoose(word, 10).map((r) => ({
      text: r.lemma, source: `wordnet:${r.via}`, confidence: 0.4, derived: true,
      note: r.via === 'domain' ? 'shares a domain (loose)' : 'exemplified by (loose)',
    }));
    return group('symbols', 'Symbols', rows, 'No symbol ingest yet; loose links only.');
  }
  function corpus(word) {
    const entries = lexiconAdapter.lookupWord(word);
    const examples = entries
      .flatMap((e) => (Array.isArray(e?.senses) ? e.senses : []))
      .flatMap((s) => (Array.isArray(s?.examples) ? s.examples : []))
      .slice(0, 6);
    return group('corpus', 'Corpus examples', examples.map((e) => ({
      text: e, source: 'entry:example', confidence: 0.7, derived: true, note: 'dictionary example',
    })), 'No corpus examples found.');
  }

  function analyze(query) {
    const c = canonical(query);
    const groups = [meaning(c), related(c), oppositions(c), sound(c), phrases(), literary(c), symbols(c), corpus(c)];
    return { query: String(query), canonical: c, generatedAt: new Date().toISOString(), groups };
  }
  return { analyze };
}
