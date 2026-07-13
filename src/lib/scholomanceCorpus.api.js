/**
 * Scholomance Super Corpus API Client
 * Interfaces with the massive literary database on the backend.
 *
 * All errors use PB-ERR-v1 bytecode for AI-parsable diagnostics.
 */

import { z } from "zod";
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from "../../codex/core/pixelbrain/bytecode-error.js";

const MOD = MODULE_IDS.SHARED;
const CORPUS_BASE_PATH = "/api/corpus";

function readEnvVar(name) {
  const viteEnv = (typeof import.meta !== "undefined" && import.meta.env)
    ? import.meta.env[name]
    : undefined;
  if (typeof viteEnv === "string") return viteEnv;

  if (typeof globalThis !== "undefined" && globalThis.process?.env) {
    const processEnvValue = globalThis.process.env[name];
    if (typeof processEnvValue === "string") return processEnvValue;
  }
  return "";
}

function resolveBaseUrl() {
  // VITE_API_BASE_URL is deliberately NOT consulted: it carried an absolute dev
  // origin (http://localhost:5173) that got baked into production builds and broke
  // every same-origin call. See codex/core/shared/apiUrl.js. The overrides below
  // are PATH overrides (e.g. /api/corpus), not origin overrides.
  const raw =
    readEnvVar("VITE_SCHOLOMANCE_CORPUS_API_URL") ||
    readEnvVar("SCHOLOMANCE_CORPUS_API_URL") ||
    readEnvVar("VITE_SCHOLOMANCE_DICT_API_URL") ||
    readEnvVar("SCHOLOMANCE_DICT_API_URL");
  const trimmed = String(raw || "").trim();
  if (!trimmed) return CORPUS_BASE_PATH;

  const normalized = trimmed.replace(/\/+$/, "");
  if (!normalized || normalized === "/") {
    return CORPUS_BASE_PATH;
  }

  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(normalized)) {
    const url = new URL(normalized);
    url.pathname = CORPUS_BASE_PATH;
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  }

  return normalized.includes("/api/")
    ? normalized.replace(/\/api\/[^/]+$/, CORPUS_BASE_PATH)
    : CORPUS_BASE_PATH;
}

const SearchSchema = z.object({
  query: z.string(),
  results: z.array(z.object({
    id: z.number(),
    text: z.string(),
    title: z.string().optional(),
    author: z.string().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    // Enriched FTS5 fields (LexOracle S1)
    snippet: z.string().optional(),
    match_score: z.number().optional(),
    match_offsets: z.array(z.tuple([z.number(), z.number()])).optional()
  }))
});

const SemanticSchema = z.object({
  word: z.string(),
  results: z.array(z.object({
    word: z.string(),
    phoneme_distance: z.number().optional(),
    rhyme_key: z.string().optional(),
    school: z.string().optional(),
    score: z.number().optional(),
  }))
});

const ContextSchema = z.object({
  id: z.number(),
  results: z.array(z.object({
    id: z.number(),
    text: z.string()
  }))
});

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 5000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    if (!res.ok) throw new BytecodeError(
      ERROR_CATEGORIES.EXT, ERROR_SEVERITY.WARN, MOD,
      ERROR_CODES.EXT_NOT_FOUND,
      { reason: 'Corpus API error', httpStatus: res.status, url },
    );
    return await res.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Corpus Oracle timed out');
    }
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Corpus Oracle is disconnected (Network Error)');
    }
    throw error;
  } finally { clearTimeout(timeout); }
}

function buildUrl(path, params = {}) {
  const baseUrl = resolveBaseUrl();
  let absoluteBase = baseUrl;
  
  // If it's a relative path, prefix with window origin
  if (baseUrl.startsWith('/') && typeof window !== 'undefined') {
    absoluteBase = `${window.location.origin}${baseUrl}`;
  }

  const url = new URL(`${absoluteBase}${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

export const ScholomanceCorpusAPI = {
  isEnabled() { return Boolean(resolveBaseUrl()); },
  getBaseUrl() { return resolveBaseUrl(); },

  async search(query, limit = 20) {
    if (!query) return [];
    const url = buildUrl('/search', { q: query, limit });
    const payload = await fetchJson(url);
    const parsed = SearchSchema.safeParse(payload);
    return parsed.success ? parsed.data.results : [];
  },

  async semantic(word, limit = 8) {
    if (!word) return [];
    const url = buildUrl('/semantic', { word, limit });
    const payload = await fetchJson(url);
    const parsed = SemanticSchema.safeParse(payload);
    return parsed.success ? parsed.data.results : [];
  },

  async getContext(id, windowSize = 2) {
    if (!id) return [];
    const url = buildUrl(`/context/${id}`, { window: windowSize });
    const payload = await fetchJson(url);
    const parsed = ContextSchema.safeParse(payload);
    return parsed.success ? parsed.data.results : [];
  }
};
