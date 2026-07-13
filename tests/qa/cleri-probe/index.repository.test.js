import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createIndexRepository } from "../../../codex/services/cleri-probe/index.repository.js";
import { sha256Hex } from "../../../codex/core/immunity/cleri-probe/canonical-report.js";

describe("Cleri Probe index repository", () => {
  let cacheDir;

  beforeEach(() => {
    cacheDir = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-index-"));
  });

  afterEach(() => {
    fs.rmSync(cacheDir, { recursive: true, force: true });
  });

  function makeKey(overrides = {}) {
    return {
      contract: "SCHOL-CLERI-PROBE-v2",
      parserVersion: "1.0.0",
      profileVersion: "1.0.0",
      repositoryFingerprint: "repo-fp-abc",
      ...overrides
    };
  }

  function cacheFile(key) {
    const keyHash = sha256Hex(
      key.contract + key.parserVersion + key.profileVersion + key.repositoryFingerprint
    );
    return path.join(cacheDir, `${keyHash}.json`);
  }

  it("stores and retrieves a report with identical content", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const key = makeKey();
    const report = {
      files: {
        "src/a.js\x00sha256:aaa": { facts: [{ callee: "fetch" }] }
      }
    };

    repo.set(key, report);
    const cached = repo.get(key);

    expect(cached).toEqual(report);
  });

  it("returns null for a cache miss", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const result = repo.get(makeKey());
    expect(result).toBeNull();
  });

  it("returns a miss and deletes the file for corrupt JSON", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const key = makeKey();
    const file = cacheFile(key);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(file, "{ not valid json");

    const result = repo.get(key);
    expect(result).toBeNull();
    expect(fs.existsSync(file)).toBe(false);
  });

  it("returns a miss and deletes the file for valid JSON with wrong checksum", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const key = makeKey();
    const file = cacheFile(key);
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify({
      contract: key.contract,
      parserVersion: key.parserVersion,
      profileVersion: key.profileVersion,
      repositoryFingerprint: key.repositoryFingerprint,
      files: {},
      checksum: "0000000000000000000000000000000000000000000000000000000000000000"
    }));

    const result = repo.get(key);
    expect(result).toBeNull();
    expect(fs.existsSync(file)).toBe(false);
  });

  it("returns a miss for a stale parser version", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const key = makeKey();
    const report = { files: {} };
    repo.set(key, report);

    const stale = repo.get(makeKey({ parserVersion: "0.9.0" }));
    expect(stale).toBeNull();
  });

  it("returns a miss for mismatched contract", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const key = makeKey();
    const report = { files: {} };
    repo.set(key, report);

    const mismatch = repo.get(makeKey({ contract: "OTHER-CONTRACT" }));
    expect(mismatch).toBeNull();
  });

  it("returns a miss for mismatched repository fingerprint", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const key = makeKey();
    const report = { files: {} };
    repo.set(key, report);

    const mismatch = repo.get(makeKey({ repositoryFingerprint: "other-fp" }));
    expect(mismatch).toBeNull();
  });

  it("writes atomically with a temp file and rename", () => {
    const repo = createIndexRepository({ cacheDir, fs });
    const key = makeKey();
    const report = { files: {} };

    repo.set(key, report);

    const file = cacheFile(key);
    const entries = fs.readdirSync(cacheDir);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatch(/^[0-9a-f]{64}\.json$/);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("throws a PB-ERR BytecodeError when cache directory cannot be created", () => {
    const parent = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-block-"));
    const blockedCacheDir = path.join(parent, "cache");
    fs.writeFileSync(blockedCacheDir, "not a directory");

    try {
      const repo = createIndexRepository({ cacheDir: blockedCacheDir, fs });
      try {
        repo.set(makeKey(), { files: {} });
        expect.fail("Expected repo.set to throw");
      } catch (err) {
        expect(err.name).toBe("BytecodeError");
        expect(err.bytecode).toMatch(/^PB-ERR-v1-/);
      }
    } finally {
      fs.rmSync(parent, { recursive: true, force: true });
    }
  });

  it("produces identical reports for identical keys from different cache directories", () => {
    const cacheDirB = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-index-b-"));
    try {
      const repoA = createIndexRepository({ cacheDir, fs });
      const repoB = createIndexRepository({ cacheDir: cacheDirB, fs });
      const key = makeKey();
      const report = {
        files: {
          "src/a.js\x00sha256:aaa": { facts: [{ callee: "fetch" }] }
        }
      };

      repoA.set(key, report);
      const fromA = repoA.get(key);
      repoB.set(key, report);
      const fromB = repoB.get(key);

      expect(fromA).toEqual(fromB);
    } finally {
      fs.rmSync(cacheDirB, { recursive: true, force: true });
    }
  });
});
