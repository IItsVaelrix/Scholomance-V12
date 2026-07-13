import { describe, expect, it, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSubstrateService } from "../../../codex/services/cleri-probe/substrate.service.js";
import { fingerprintSubstrate } from "../../../codex/core/immunity/cleri-probe/canonical-report.js";
import { ERROR_CATEGORIES, ERROR_SEVERITY, ERROR_CODES, MODULE_IDS } from "../../../codex/core/pixelbrain/bytecode-error.js";

describe("Cleri Probe substrate service", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-substrate-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function write(root, relPath, content) {
    const full = path.join(root, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  function symlink(root, relTarget, relLink) {
    const fullTarget = path.join(root, relTarget);
    const fullLink = path.join(root, relLink);
    fs.mkdirSync(path.dirname(fullLink), { recursive: true });
    fs.symlinkSync(fullTarget, fullLink);
  }

  it("resolveScope returns sorted repository-relative files", async () => {
    write(tmpDir, "src/b.js", "export const b = 2;");
    write(tmpDir, "src/a.js", "export const a = 1;");
    write(tmpDir, "src/nested/c.jsx", "export const c = 3;");

    const service = createSubstrateService({ fs, root: tmpDir });
    const result = await service.resolveScope({ paths: ["src"] });

    expect(result.requestedPaths).toEqual(["src"]);
    expect(result.files.map(f => f.path)).toEqual(["src/a.js", "src/b.js", "src/nested/c.jsx"]);
    expect(result.files.every(f => !f.path.includes(tmpDir))).toBe(true);
    expect(result.skipped).toEqual([]);
    expect(result.rootFingerprint).toBe(fingerprintSubstrate(result.files));
  });

  it("throws a PB-ERR BytecodeError when root does not exist", () => {
    const missingRoot = path.join(tmpDir, "does-not-exist");

    try {
      createSubstrateService({ fs, root: missingRoot });
      expect.fail("Expected createSubstrateService to throw");
    } catch (err) {
      expect(err.name).toBe("BytecodeError");
      expect(err.bytecode).toMatch(/^PB-ERR-v1-/);
      expect(err.category).toBe(ERROR_CATEGORIES.VALUE);
      expect(err.severity).toBe(ERROR_SEVERITY.CRIT);
      expect(err.moduleId).toBe(MODULE_IDS.IMMUNITY);
      expect(err.errorCode).toBe(ERROR_CODES.INVALID_VALUE);
    }
  });

  it("throws PB-ERR INVALID_VALUE when a path escapes the root", async () => {
    write(tmpDir, "src/a.js", "export const a = 1;");

    const service = createSubstrateService({ fs, root: tmpDir });
    await expect(service.resolveScope({ paths: ["../outside"] })).rejects.toThrow();

    try {
      await service.resolveScope({ paths: ["../outside"] });
    } catch (err) {
      expect(err.name).toBe("BytecodeError");
      expect(err.category).toBe(ERROR_CATEGORIES.VALUE);
      expect(err.severity).toBe(ERROR_SEVERITY.CRIT);
      expect(err.moduleId).toBe(MODULE_IDS.IMMUNITY);
      expect(err.errorCode).toBe(ERROR_CODES.INVALID_VALUE);
    }
  });

  it("walks a directory once even when a symlink loops back to an ancestor", async () => {
    write(tmpDir, "src/game/damage.js", "export const damage = 1;");
    // src/game/loop -> src. Keying the re-entry guard on the link path instead of
    // the real directory lets this produce an endlessly new alias
    // (src/game/loop/game/loop/...) and analyze the same file at every depth.
    symlink(tmpDir, "src", "src/game/loop");

    const service = createSubstrateService({ fs, root: tmpDir });
    const result = await service.resolveScope({ paths: ["src"] });

    expect(result.files.map(file => file.path)).toEqual(["src/game/damage.js"]);
    expect(result.skipped).toContainEqual({ path: "src/game/loop", reasonCode: "SYMLINK_LOOP" });
  });

  it("skips symlinks that escape the root with SYMLINK_OUTSIDE_ROOT", async () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-outside-"));
    try {
      fs.writeFileSync(path.join(outsideDir, "secret.js"), "export const secret = 1;");
      fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
      fs.symlinkSync(outsideDir, path.join(tmpDir, "src", "external"), "dir");

      const service = createSubstrateService({ fs, root: tmpDir });
      const result = await service.resolveScope({ paths: ["src"] });

      expect(result.files).toHaveLength(0);
      expect(result.skipped).toContainEqual({ path: "src/external", reasonCode: "SYMLINK_OUTSIDE_ROOT" });
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  it("applies default exclusions for .git, node_modules, dist, coverage, docs, generated", async () => {
    write(tmpDir, "src/keep.js", "export const keep = 1;");
    write(tmpDir, ".git/config", "[core]");
    write(tmpDir, "node_modules/pkg/index.js", "module.exports = 1;");
    write(tmpDir, "dist/bundle.js", "console.log(1);");
    write(tmpDir, "coverage/lcov-report/index.js", "console.log(1);");
    write(tmpDir, "docs/readme.md", "# readme");
    write(tmpDir, "generated/output.js", "console.log(1);");

    const service = createSubstrateService({ fs, root: tmpDir });
    const result = await service.resolveScope({ paths: ["."] });

    const paths = result.files.map(f => f.path);
    expect(paths).toEqual(["src/keep.js"]);
    expect(paths).not.toContain(expect.stringContaining(".git"));
    expect(paths).not.toContain(expect.stringContaining("node_modules"));
    expect(paths).not.toContain(expect.stringContaining("dist/"));
    expect(paths).not.toContain(expect.stringContaining("coverage/"));
    expect(paths).not.toContain(expect.stringContaining("docs/"));
    expect(paths).not.toContain(expect.stringContaining("generated/"));
  });

  it("opts into coverage with includeTests and into docs/generated with includeGenerated", async () => {
    write(tmpDir, "src/keep.js", "export const keep = 1;");
    write(tmpDir, "coverage/lcov-report/index.js", "console.log(1);");
    write(tmpDir, "docs/readme.md", "# readme");
    write(tmpDir, "generated/output.js", "console.log(1);");

    const service = createSubstrateService({
      fs,
      root: tmpDir,
      limits: { includeTests: true, includeGenerated: true }
    });
    const result = await service.resolveScope({ paths: ["."] });

    const paths = result.files.map(f => f.path);
    expect(paths).toContain("generated/output.js");
    expect(paths).toContain("coverage/lcov-report/index.js");
    // docs contains only markdown, so no supported source files
    expect(paths).not.toContain(expect.stringContaining("docs/"));
  });

  it("skips files larger than maxFileBytes with FILE_TOO_LARGE", async () => {
    const small = "export const a = 1;";
    const big = "x".repeat(100);
    write(tmpDir, "src/small.js", small);
    write(tmpDir, "src/big.js", big);

    const service = createSubstrateService({
      fs,
      root: tmpDir,
      limits: { maxFileBytes: 50 }
    });
    const result = await service.resolveScope({ paths: ["src"] });

    expect(result.files.map(f => f.path)).toEqual(["src/small.js"]);
    expect(result.skipped).toContainEqual({ path: "src/big.js", reasonCode: "FILE_TOO_LARGE" });
  });

  it("skips symlink loops with SYMLINK_LOOP", async () => {
    fs.mkdirSync(path.join(tmpDir, "src"), { recursive: true });
    fs.symlinkSync(path.join(tmpDir, "src", "loop"), path.join(tmpDir, "src", "loop"));

    const service = createSubstrateService({ fs, root: tmpDir });
    const result = await service.resolveScope({ paths: ["src"] });

    expect(result.files).toHaveLength(0);
    expect(result.skipped).toContainEqual({ path: "src/loop", reasonCode: "SYMLINK_LOOP" });
  });

  it("skips unreadable files with READ_ERROR", async () => {
    write(tmpDir, "src/broken.js", "export const a = 1;");
    fs.chmodSync(path.join(tmpDir, "src", "broken.js"), 0o000);

    const service = createSubstrateService({ fs, root: tmpDir });
    const result = await service.resolveScope({ paths: ["src"] });

    fs.chmodSync(path.join(tmpDir, "src", "broken.js"), 0o644);

    expect(result.skipped).toContainEqual({ path: "src/broken.js", reasonCode: "READ_ERROR" });
  });

  it("skips paths with terminal escape characters with INVALID_PATH", async () => {
    write(tmpDir, "src/normal.js", "export const a = 1;");

    const service = createSubstrateService({ fs, root: tmpDir });
    const result = await service.resolveScope({ paths: ["src", "src\x1b[31mred"] });

    expect(result.files.map(f => f.path)).toEqual(["src/normal.js"]);
    expect(result.skipped).toContainEqual({ path: "src\x1b[31mred", reasonCode: "INVALID_PATH" });
  });

  it("produces identical fingerprints for two roots with identical relative source", async () => {
    const rootA = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-root-a-"));
    const rootB = fs.mkdtempSync(path.join(os.tmpdir(), "cleri-root-b-"));
    try {
      write(rootA, "src/x.js", "export const x = 1;");
      write(rootA, "src/y.ts", "export const y = 2;");
      write(rootB, "src/x.js", "export const x = 1;");
      write(rootB, "src/y.ts", "export const y = 2;");

      const serviceA = createSubstrateService({ fs, root: rootA });
      const serviceB = createSubstrateService({ fs, root: rootB });
      const resultA = await serviceA.resolveScope({ paths: ["src"] });
      const resultB = await serviceB.resolveScope({ paths: ["src"] });

      expect(resultA.rootFingerprint).toBe(resultB.rootFingerprint);
      expect(resultA.files.map(f => f.path)).toEqual(resultB.files.map(f => f.path));
      expect(resultA.files.map(f => f.content)).toEqual(resultB.files.map(f => f.content));
      expect(resultA.files.map(f => f.contentHash)).toEqual(resultB.files.map(f => f.contentHash));
    } finally {
      fs.rmSync(rootA, { recursive: true, force: true });
      fs.rmSync(rootB, { recursive: true, force: true });
    }
  });

  it("never returns the absolute root in any field", async () => {
    write(tmpDir, "src/a.js", "export const a = 1;");

    const service = createSubstrateService({ fs, root: tmpDir });
    const result = await service.resolveScope({ paths: ["src"] });

    const json = JSON.stringify(result);
    expect(json).not.toContain(tmpDir);
    expect(json).not.toContain(path.resolve(tmpDir));
  });
});
