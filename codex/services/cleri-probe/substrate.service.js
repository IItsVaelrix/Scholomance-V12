/**
 * Bounded filesystem substrate loader for Cleri Probe.
 *
 * Resolves repository-relative scopes, normalizes real paths, refuses root
 * escape, sorts directory entries, applies configurable exclusions, and
 * computes content-addressed file records.
 *
 * This is a service module and therefore may use node:fs, node:path, and
 * node:os in its composition root only.
 */

import path from "node:path";
import os from "node:os";
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from "../../core/pixelbrain/bytecode-error.js";
import {
  normalizeRepositoryPath,
  deepFreeze
} from "../../core/immunity/cleri-probe/contracts.js";
import {
  sha256Hex,
  fingerprintSubstrate
} from "../../core/immunity/cleri-probe/canonical-report.js";

const SUPPORTED_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs"
]);

const DEFAULT_EXCLUSIONS = Object.freeze([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "docs",
  "generated"
]);

function validationError(message, context = {}) {
  const error = new BytecodeError(
    ERROR_CATEGORIES.VALUE,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.INVALID_VALUE,
    { message, ...context }
  );
  error.message = message;
  return error;
}

function containsControlCharacters(value) {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function contentHash(content) {
  return `sha256:${sha256Hex(content)}`;
}

/**
 * Extracts the exact source text a span covers.
 *
 * Line and column numbers are one-based and inclusive at both ends, and CRLF is
 * normalized exactly as the parser normalized it, so the digest of this excerpt
 * is comparable to the span's recorded excerptDigest. That comparison is how
 * `verify` detects substrate drift: the report is intact but the code moved.
 *
 * @returns {string|null} the excerpt, or null when the span falls outside the file.
 */
export function readSpanExcerpt(content, span) {
  if (typeof content !== 'string' || !span) return null;

  const text = content.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  const startLine = Number(span.startLine);
  const endLine = Number(span.endLine);
  const startColumn = Number(span.startColumn);
  const endColumn = Number(span.endColumn);

  if (!Number.isFinite(startLine) || !Number.isFinite(endLine)) return null;
  if (startLine < 1 || endLine < startLine || endLine > lines.length) return null;

  const offsetOf = (line, column) => {
    let offset = 0;
    for (let i = 0; i < line - 1; i += 1) {
      offset += lines[i].length + 1;
    }
    return offset + (column - 1);
  };

  const start = offsetOf(startLine, startColumn);
  // The end position is inclusive, so the excerpt reaches one character past it.
  const end = offsetOf(endLine, endColumn) + 1;
  if (start < 0 || end > text.length || end < start) return null;

  return text.slice(start, end);
}

export function createSubstrateService({ fs, root, limits = {}, cacheDir }) {
  if (!fs || typeof fs !== "object") {
    throw validationError("fs must be provided", { fs });
  }
  if (!root || typeof root !== "string") {
    throw validationError("root must be a non-empty string", { root });
  }

  let resolvedRoot;
  try {
    resolvedRoot = fs.realpathSync(root);
  } catch (err) {
    throw validationError("Failed to resolve repository root", { root, originalError: err.message });
  }
  const effectiveCacheDir = cacheDir ?? resolveDefaultCacheDir(resolvedRoot);

  const {
    maxFileBytes = 2 * 1024 * 1024,
    includeTests = false,
    includeGenerated = false
  } = limits;

  const exclusions = new Set(DEFAULT_EXCLUSIONS);
  if (includeTests) exclusions.delete("coverage");
  if (includeGenerated) {
    exclusions.delete("docs");
    exclusions.delete("generated");
  }

  function isInsideRoot(absolutePath) {
    let real;
    try {
      real = fs.realpathSync(absolutePath);
    } catch {
      real = path.resolve(absolutePath);
    }
    return real === resolvedRoot || real.startsWith(`${resolvedRoot}${path.sep}`);
  }

  function resolveRepositoryPath(relPath) {
    const normalized = normalizeRepositoryPath(relPath);
    if (normalized === null || normalized === undefined) return "";
    if (containsControlCharacters(normalized)) return null;
    return normalized;
  }

  function shouldExclude(name) {
    return exclusions.has(name);
  }

  function hasSupportedExtension(name) {
    const ext = path.extname(name).toLowerCase();
    return SUPPORTED_EXTENSIONS.has(ext);
  }

  function readDirectory(dirRelPath, files, skipped, seenSymlinks, visitedDirs) {
    const dirAbs = dirRelPath ? path.join(resolvedRoot, dirRelPath) : resolvedRoot;

    // A directory is walked once, by its real identity. Keying the guard on the
    // link path instead lets `src/game/loop -> src` re-enter through an endlessly
    // new alias (src/game/loop/game/loop/...), analyzing the same physical file
    // at every depth.
    let realDir;
    try {
      realDir = fs.realpathSync(dirAbs);
    } catch {
      realDir = path.resolve(dirAbs);
    }
    if (visitedDirs.has(realDir)) {
      skipped.push({ path: dirRelPath || ".", reasonCode: "SYMLINK_LOOP" });
      return;
    }
    visitedDirs.add(realDir);

    let entries;
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      skipped.push({ path: dirRelPath || ".", reasonCode: "READ_ERROR" });
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      const entryRelPath = dirRelPath ? `${dirRelPath}/${entry.name}` : entry.name;

      if (shouldExclude(entry.name)) {
        skipped.push({ path: entryRelPath, reasonCode: "EXCLUDED" });
        continue;
      }

      const entryAbs = path.join(dirAbs, entry.name);

      if (entry.isSymbolicLink()) {
        let linkTarget;
        try {
          linkTarget = fs.readlinkSync(entryAbs);
        } catch {
          skipped.push({ path: entryRelPath, reasonCode: "READ_ERROR" });
          continue;
        }

        const resolvedTarget = path.resolve(dirAbs, linkTarget);
        let realTarget;
        try {
          realTarget = fs.realpathSync(resolvedTarget);
        } catch (err) {
          if (err && err.code === "ELOOP") {
            skipped.push({ path: entryRelPath, reasonCode: "SYMLINK_LOOP" });
          } else {
            skipped.push({ path: entryRelPath, reasonCode: "READ_ERROR" });
          }
          continue;
        }

        if (!isInsideRoot(realTarget)) {
          skipped.push({ path: entryRelPath, reasonCode: "SYMLINK_OUTSIDE_ROOT" });
          continue;
        }

        const linkKey = `${entryAbs}->${realTarget}`;
        if (seenSymlinks.has(linkKey)) {
          skipped.push({ path: entryRelPath, reasonCode: "SYMLINK_LOOP" });
          continue;
        }
        seenSymlinks.add(linkKey);

        let stat;
        try {
          stat = fs.statSync(entryAbs);
        } catch (err) {
          if (err && err.code === "ELOOP") {
            skipped.push({ path: entryRelPath, reasonCode: "SYMLINK_LOOP" });
          } else {
            skipped.push({ path: entryRelPath, reasonCode: "READ_ERROR" });
          }
          continue;
        }

        if (stat.isDirectory()) {
          readDirectory(entryRelPath, files, skipped, seenSymlinks, visitedDirs);
        } else if (stat.isFile() && hasSupportedExtension(entry.name)) {
          readFile(entryRelPath, files, skipped);
        }
        continue;
      }

      if (entry.isDirectory()) {
        readDirectory(entryRelPath, files, skipped, seenSymlinks, visitedDirs);
      } else if (entry.isFile() && hasSupportedExtension(entry.name)) {
        readFile(entryRelPath, files, skipped);
      }
    }
  }

  function readFile(relPath, files, skipped) {
    const absPath = path.join(resolvedRoot, relPath);
    let stat;
    try {
      stat = fs.statSync(absPath);
    } catch {
      skipped.push({ path: relPath, reasonCode: "READ_ERROR" });
      return;
    }

    if (stat.size > maxFileBytes) {
      skipped.push({ path: relPath, reasonCode: "FILE_TOO_LARGE" });
      return;
    }

    let content;
    try {
      content = fs.readFileSync(absPath, "utf8");
    } catch {
      skipped.push({ path: relPath, reasonCode: "READ_ERROR" });
      return;
    }

    files.push({
      path: relPath,
      content,
      contentHash: contentHash(content),
      bytes: stat.size
    });
  }

  const service = {
    async resolveScope({ paths = [] } = {}) {
      const rawPaths = [...paths].map(p => ({ raw: p, resolved: resolveRepositoryPath(p) }));
      const validPaths = [];
      const skipped = [];

      for (const item of rawPaths) {
        if (item.resolved === null) {
          skipped.push({ path: normalizeRepositoryPath(item.raw), reasonCode: "INVALID_PATH" });
        } else if (item.resolved === "") {
          validPaths.push("");
        } else {
          validPaths.push(item.resolved);
        }
      }

      const requestedPaths = Array.from(new Set(validPaths)).sort();

      for (const relPath of requestedPaths) {
        const absPath = path.join(resolvedRoot, relPath);
        const realPath = (() => {
          try {
            return fs.realpathSync(absPath);
          } catch {
            return path.resolve(absPath);
          }
        })();
        if (!isInsideRoot(realPath)) {
          throw validationError("Path escapes repository root", { path: relPath });
        }
      }

      const files = [];
      const seenSymlinks = new Set();
      const visitedDirs = new Set();

      for (const relPath of requestedPaths) {
        const absPath = path.join(resolvedRoot, relPath);
        let stat;
        try {
          stat = fs.statSync(absPath);
        } catch {
          skipped.push({ path: relPath, reasonCode: "READ_ERROR" });
          continue;
        }

        if (stat.isDirectory()) {
          readDirectory(relPath, files, skipped, seenSymlinks, visitedDirs);
        } else if (stat.isFile() && hasSupportedExtension(path.basename(relPath))) {
          readFile(relPath, files, skipped);
        }
      }

      files.sort((a, b) => a.path.localeCompare(b.path));
      skipped.sort((a, b) => a.path.localeCompare(b.path) || a.reasonCode.localeCompare(b.reasonCode));

      return deepFreeze({
        rootFingerprint: fingerprintSubstrate(files),
        requestedPaths,
        files,
        skipped
      });
    }
  };

  Object.defineProperty(service, "root", { value: resolvedRoot, enumerable: false, writable: false, configurable: false });
  Object.defineProperty(service, "cacheDir", { value: effectiveCacheDir, enumerable: false, writable: false, configurable: false });

  return service;
}

function resolveDefaultCacheDir(resolvedRoot) {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache");
  const repositoryFingerprint = sha256Hex(resolvedRoot);
  return path.join(base, "scholomance", "cleri-probe", repositoryFingerprint);
}
