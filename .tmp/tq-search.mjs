/**
 * Local helper: invoke the project's TurboQuant codebase search.
 * Usage: node --env-file=.env .tmp/tq-search.mjs <mode> "<query>"
 *   mode: hybrid | semantic | forensic | neighbors | list
 */
import {
  searchCodebase,
  searchHybrid,
  forensicSearch,
  getFileNeighbors,
  listIndexedFiles,
} from '../codex/server/services/codebaseSearch.service.js';

const mode = process.argv[2] || 'hybrid';
const query = process.argv[3] || '';

function row(r) {
  const score = typeof r.score === 'number' ? r.score.toFixed(4) : '-';
  console.log(`${score}  ${r.file_path}${r.chunk_index != null ? ':' + r.chunk_index : ''}`);
  if (r.preview) console.log('   ' + String(r.preview).replace(/\s+/g, ' ').slice(0, 140));
}

function show(res) {
  if (Array.isArray(res)) { res.slice(0, 20).forEach(row); return; }
  if (res?.literal || res?.semantic) {
    console.log('-- SEMANTIC --'); (res.semantic ?? []).slice(0, 10).forEach(row);
    console.log('-- LITERAL --'); (res.literal ?? []).slice(0, 8).forEach(row);
    if (res.phonetic?.length) { console.log('-- PHONETIC --'); res.phonetic.slice(0, 5).forEach(row); }
    if (res.linkedDocs?.length) { console.log('-- DOCS --'); res.linkedDocs.forEach(d => console.log('   ' + d.file_path)); }
  } else {
    (res?.results ?? []).slice(0, 14).forEach(row);
  }
  if (res?.metadata) console.log('meta:', JSON.stringify(res.metadata));
}

let out;
if (mode === 'semantic') out = await searchCodebase(query);
else if (mode === 'forensic') out = await forensicSearch(query, { limit: 20 });
else if (mode === 'neighbors') out = await getFileNeighbors(query);
else if (mode === 'list') out = await listIndexedFiles();
else out = await searchHybrid(query);

show(out);
process.exit(0);
