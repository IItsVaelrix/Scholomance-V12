import { buildAuthorityUrl } from "./apiUrl.js";

function getAuthEndpoint(path) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return buildAuthorityUrl(`/auth/${normalizedPath}`);
}

let globalCsrfToken = null;
let globalCsrfPromise = null;

export const clearCsrfToken = () => {
  globalCsrfToken = null;
  globalCsrfPromise = null;
};

export const getCsrfToken = async (forceRefresh = false) => {
  if (globalCsrfToken && !forceRefresh) return globalCsrfToken;
  if (globalCsrfPromise && !forceRefresh) return globalCsrfPromise;

  globalCsrfPromise = (async () => {
    try {
      const res = await fetch(getAuthEndpoint("csrf-token"), { credentials: 'include' });
      if (res.ok) {
        const { token } = await res.json();
        globalCsrfToken = token;
        return token;
      }
      throw new Error(`CSRF fetch failed: ${res.status}`);
    } catch (e) {
      console.error("Failed to fetch CSRF token", e);
      globalCsrfToken = null;
      throw e;
    } finally {
      globalCsrfPromise = null;
    }
  })();

  return globalCsrfPromise;
};

export const csrfFetch = async (url, options = {}) => {
  const token = await getCsrfToken();
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      'x-csrf-token': token,
    },
  });
};
