/**
 * Content-addressed disposable index for Cleri Probe.
 *
 * Stores advisory per-file fact records keyed by repository-relative path and
 * content hash. Writes are atomic (temp file + fsync + rename). Reads validate
 * contract, parser/profile versions, repository fingerprint, and checksum;
 * corrupt entries are treated as misses and removed.
 *
 * This is a service module and therefore may use node:fs and node:path.
 */

import path from "node:path";
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from "../../core/pixelbrain/bytecode-error.js";
import { sha256Hex, stableStringify } from "../../core/immunity/cleri-probe/canonical-report.js";

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

function buildCacheKey({ contract, parserVersion, profileVersion, repositoryFingerprint }) {
  return sha256Hex(contract + parserVersion + profileVersion + repositoryFingerprint);
}

function checksumEnvelope(envelope) {
  const canonical = { ...envelope };
  delete canonical.checksum;
  return sha256Hex(canonical);
}

function validateKey(key) {
  if (!key || typeof key !== "object") {
    throw validationError("Index key must be an object", { key });
  }
  const fields = ["contract", "parserVersion", "profileVersion", "repositoryFingerprint"];
  for (const field of fields) {
    if (typeof key[field] !== "string" || key[field].length === 0) {
      throw validationError(`Index key must include a non-empty ${field}`, { field, value: key[field] });
    }
  }
}

export function createIndexRepository({ cacheDir, fs }) {
  if (!cacheDir || typeof cacheDir !== "string") {
    throw validationError("cacheDir must be a non-empty string", { cacheDir });
  }
  if (!fs || typeof fs !== "object") {
    throw validationError("fs must be provided", { fs });
  }

  function cacheFile(key) {
    const keyHash = buildCacheKey(key);
    return path.join(cacheDir, `${keyHash}.json`);
  }

  function remove(file) {
    try {
      fs.unlinkSync(file);
    } catch {
      // Entry may already be gone; treat as successful removal.
    }
  }

  function readValidated(key) {
    const file = cacheFile(key);
    let raw;
    try {
      raw = fs.readFileSync(file, "utf8");
    } catch {
      return null;
    }

    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      remove(file);
      return null;
    }

    if (
      !envelope ||
      typeof envelope !== "object" ||
      envelope.contract !== key.contract ||
      envelope.parserVersion !== key.parserVersion ||
      envelope.profileVersion !== key.profileVersion ||
      envelope.repositoryFingerprint !== key.repositoryFingerprint ||
      typeof envelope.checksum !== "string"
    ) {
      remove(file);
      return null;
    }

    if (checksumEnvelope(envelope) !== envelope.checksum) {
      remove(file);
      return null;
    }

    return envelope;
  }

  return {
    get(key) {
      validateKey(key);
      const envelope = readValidated(key);
      if (!envelope) return null;
      return envelope.payload ?? null;
    },

    set(key, payload) {
      validateKey(key);
      if (payload === undefined) {
        throw validationError("Index payload must not be undefined", { key });
      }

      const envelope = {
        contract: key.contract,
        parserVersion: key.parserVersion,
        profileVersion: key.profileVersion,
        repositoryFingerprint: key.repositoryFingerprint,
        createdAt: Date.now(),
        payload,
        checksum: null
      };
      envelope.checksum = checksumEnvelope(envelope);

      const file = cacheFile(key);
      const tempFile = `${file}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;

      try {
        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(tempFile, stableStringify(envelope), "utf8");
        const fd = fs.openSync(tempFile, "r+");
        try {
          fs.fsyncSync(fd);
        } finally {
          fs.closeSync(fd);
        }
        fs.renameSync(tempFile, file);
      } catch (err) {
        remove(tempFile);
        throw validationError("Failed to write index entry", { cacheDir, file, originalError: err.message });
      }
    },

    delete(key) {
      validateKey(key);
      remove(cacheFile(key));
    }
  };
}
