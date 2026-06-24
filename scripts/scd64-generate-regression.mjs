#!/usr/bin/env node
/**
 * scripts/scd64-generate-regression.mjs
 *
 * CLI entry-point for Phase 5 of the SCD64 robust-pass PDR.
 *
 * Usage:
 *   node scripts/scd64-generate-regression.mjs path/to/diagnostic.json
 *   node scripts/scd64-generate-regression.mjs path/to/diagnostic.json --overwrite
 *   node scripts/scd64-generate-regression.mjs path/to/diagnostic.json --dry-run
 *
 * Options:
 *   --overwrite   Replace an existing regression test file.
 *   --dry-run     Print generated source to stdout without writing to disk.
 *   --help        Show usage.
 *
 * Input format (diagnostic.json):
 *   {
 *     "diagnostic": {
 *       "checksum64": "01861DF4...",
 *       "bugFamily": "COLOR_DRAGON",
 *       "slots": [...],
 *       "runtimeEvidence": { "backend": {}, "frontend": {}, "comparison": {} }
 *     }
 *   }
 *
 * The script also accepts a flat shape (no "diagnostic" wrapper) for
 * convenience when piping from SpatialImmuneOrchestrator output directly.
 *
 * DIAGNOSE_ONLY — this script never mutates application source code.
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

// ── Bootstrap TypeScript via tsx (if available) or fall back to ts-node ──────
// The generator module is TypeScript; we resolve it at runtime.
// Running this file with `node --import tsx/esm` is the supported path.
// If tsx is not configured, we fall back to a transpiled JS import path.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// ── Argument parsing ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help")) {
  console.log(`
SCD64 Regression Test Generator
────────────────────────────────
Usage:
  node scripts/scd64-generate-regression.mjs <diagnostic.json> [options]

Options:
  --overwrite   Replace an existing regression test file on disk.
  --dry-run     Print generated test source to stdout (no file written).
  --help        Show this message.

Example:
  node scripts/scd64-generate-regression.mjs captured/color-dragon.json
  node scripts/scd64-generate-regression.mjs captured/color-dragon.json --dry-run
`);
  process.exit(args.includes("--help") ? 0 : 1);
}

const inputFile = args.find((a) => !a.startsWith("--"));
const overwrite = args.includes("--overwrite");
const dryRun = args.includes("--dry-run");

if (!inputFile) {
  console.error("[SCD64] Error: No diagnostic JSON file specified.");
  process.exit(1);
}

// ── Load diagnostic JSON ──────────────────────────────────────────────────────

async function loadDiagnostic(filePath) {
  const abs = path.resolve(filePath);
  let raw;
  try {
    raw = await fs.readFile(abs, "utf-8");
  } catch {
    console.error(`[SCD64] Cannot read file: ${abs}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error(`[SCD64] Invalid JSON in: ${abs}`);
    process.exit(1);
  }

  // Accept both wrapped { diagnostic: {...} } and flat { checksum64, ... }
  const diagnostic = parsed.diagnostic ?? parsed;

  if (!diagnostic.checksum64 || !/^[0-9A-F]{64}$/.test(diagnostic.checksum64)) {
    console.error(
      `[SCD64] diagnostic.checksum64 must be exactly 64 uppercase hex chars.`,
    );
    process.exit(1);
  }
  if (!diagnostic.bugFamily) {
    console.error(`[SCD64] diagnostic.bugFamily is required.`);
    process.exit(1);
  }

  // Ensure required keys exist (default to empty objects)
  diagnostic.runtimeEvidence = diagnostic.runtimeEvidence ?? {};
  diagnostic.slots = diagnostic.slots ?? [];

  return { diagnostic };
}

// ── Dynamic import of the TS generator (requires tsx / ts-node in PATH) ───────

async function importGenerator() {
  // Try tsx-compiled path first (works when running under tsx/esm loader).
  try {
    const mod = await import("../src/core/scd64/generateSCD64RegressionTest.ts");
    return mod;
  } catch {
    // Fallback: look for a pre-compiled JS output (tsc output dir)
    try {
      const mod = await import("../dist/core/scd64/generateSCD64RegressionTest.js");
      return mod;
    } catch {
      console.error(
        `[SCD64] Could not import generateSCD64RegressionTest.\n` +
          `  Run this script with tsx:  npx tsx scripts/scd64-generate-regression.mjs ...\n` +
          `  Or build first:            npx tsc && node scripts/scd64-generate-regression.mjs ...`,
      );
      process.exit(1);
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const input = await loadDiagnostic(inputFile);
  const { generateSCD64RegressionTest, writeSCD64RegressionTest } =
    await importGenerator();

  let generated;
  try {
    generated = generateSCD64RegressionTest(input);
  } catch (err) {
    console.error(`[SCD64] Generation failed: ${err.message}`);
    process.exit(1);
  }

  if (dryRun) {
    console.log(`\n${"─".repeat(72)}`);
    console.log(`// Dry run — would write to: ${generated.relativePath}`);
    console.log(`${"─".repeat(72)}\n`);
    console.log(generated.source);
    console.log(`${"─".repeat(72)}`);
    console.log(`[SCD64] Dry run complete. No file written.`);
    return;
  }

  let absPath;
  try {
    absPath = writeSCD64RegressionTest(projectRoot, generated, overwrite);
  } catch (err) {
    console.error(`[SCD64] ${err.message}`);
    console.error(`  Use --overwrite to replace an existing fossil.`);
    process.exit(1);
  }

  console.log(`[SCD64] Regression test written to: ${absPath}`);
  console.log(`[SCD64] Family   : ${generated.bugFamily}`);
  console.log(`[SCD64] Checksum : ${generated.checksum64}`);
  console.log(`[SCD64] Run with : npx vitest run ${generated.relativePath}`);
}

main();
