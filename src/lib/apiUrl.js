function readViteEnv(name) {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const value = import.meta.env[name];
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

export function buildAuthorityUrl(path) {
  const normalizedPath = normalizePath(path);
  const configuredBase = String(readViteEnv("VITE_API_BASE_URL") || "")
    .trim()
    .replace(/\/+$/, "");

  if (configuredBase) {
    if (isAbsoluteUrl(configuredBase)) {
      return new URL(normalizedPath, `${configuredBase}/`).toString();
    }
    return joinRelativeBase(configuredBase, normalizedPath);
  }

  // Default to same-origin paths so Vite dev proxy and deployed reverse proxies
  // control the upstream authority instead of pinning requests to localhost:3000.
  return normalizedPath;
}
