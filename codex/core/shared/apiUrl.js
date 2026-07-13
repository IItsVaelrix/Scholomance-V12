function readViteEnv(name) {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const value = import.meta.env[name];
    if (typeof value === "string") {
      return value;
    }
  }
  if (typeof globalThis !== "undefined" && globalThis.process?.env) {
    const value = globalThis.process.env[name];
    if (typeof value === "string") {
      return value;
    }
  }
  return "";
}

function normalizePath(path) {
  const value = String(path || "").trim();
  if (!value) return "/";
  return value.startsWith("/") ? value : `/${value}`;
}

function isAbsoluteUrl(value) {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(value);
}

function joinRelativeBase(basePath, path) {
  const normalizedBase = `/${String(basePath || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")}`;

  return normalizedBase === "/" ? path : `${normalizedBase}${path}`;
}

/**
 * Always same-origin. Deliberately mode-independent — there is no dev/prod branch.
 *
 * The API is ALWAYS on the same origin as the app:
 *   dev  — Vite serves the app and proxies /api, /auth and /collab to the server
 *          (see vite.config.js), so a relative path resolves correctly.
 *   prod — Fastify serves both the bundle and the API from one origin.
 *
 * It cannot be otherwise: the CSP is `connect-src 'self'` (plus two public APIs),
 * so a cross-origin API base would be blocked by our own policy.
 *
 * This used to honour VITE_API_BASE_URL, and that caused a full outage class.
 * `.env` set it to http://localhost:5173 (a DEV value), so ANY local `npm run
 * build` baked that absolute origin into the production bundle. Every call then
 * went cross-origin, CSP blocked it — including GET /auth/csrf-token, which is
 * what GRANTS the guest lexicon session — so /api/lexicon/lookup-batch returned
 * 401, the phoneme engine reported "Dictionary authority unavailable", and
 * TrueSight went blank. The symptom surfaced as "Dictionary Oracle timed out",
 * naming the wrong subsystem entirely.
 *
 * Do not reintroduce an origin override here. If you ever genuinely need to point
 * the client at another origin, that is a CSP change and a deployment-topology
 * decision, not an env var.
 */
export function buildAuthorityUrl(path) {
  return normalizePath(path);
}
