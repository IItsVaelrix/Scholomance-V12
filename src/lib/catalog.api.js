/**
 * Catalog API client — fetches the Sonic Exchange read endpoints
 * (codex/server/routes/catalog.routes.js). Resolves the API base from
 * VITE_API_BASE_URL, falling back to same-origin relative paths.
 */

function readEnvVar(name) {
  const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env)
    ? import.meta.env[name]
    : undefined;
  if (typeof viteEnv === 'string') return viteEnv;
  if (typeof globalThis !== 'undefined' && globalThis.process?.env) {
    const v = globalThis.process.env[name];
    if (typeof v === 'string') return v;
  }
  return '';
}

// Same-origin, always. See codex/core/shared/apiUrl.js for why there is no
// VITE_API_BASE_URL override: a dev origin baked into a production build broke
// the CSRF fetch that grants the lexicon session, which 401'd the dictionary and
// blanked TrueSight.
async function getJson(path) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const err = new Error(`Catalog request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export function fetchArtist(handle) {
  return getJson(`/api/catalog/artists/${encodeURIComponent(handle)}`);
}

export function fetchRelease(releaseId) {
  return getJson(`/api/catalog/releases/${encodeURIComponent(releaseId)}`);
}

export function fetchGrimoire(trackId) {
  return getJson(`/api/catalog/tracks/${encodeURIComponent(trackId)}/grimoire`);
}

export function resolveTrackId(streamUrl) {
  return getJson(`/api/catalog/tracks/resolve?streamUrl=${encodeURIComponent(streamUrl)}`);
}
