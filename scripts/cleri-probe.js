#!/usr/bin/env node
/**
 * Cleri Probe evidence-first investigation CLI.
 *
 * Entrypoint only. Argument parsing, command routing, and rendering live in
 * scripts/cleri-probe/.
 */

import { parseArgs } from "./cleri-probe/args.js";
import { run } from "./cleri-probe/commands.js";
import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from "../codex/core/pixelbrain/bytecode-error.js";

async function main() {
  try {
    const args = parseArgs();
    const code = await run(args);
    process.exit(code);
  } catch (error) {
    if (error instanceof BytecodeError) {
      process.stderr.write(error.bytecode + "\n");
    } else {
      const wrapped = new BytecodeError(
        ERROR_CATEGORIES.STATE,
        ERROR_SEVERITY.CRIT,
        MODULE_IDS.IMMUNITY,
        ERROR_CODES.INVARIANT_VIOLATION,
        { message: error.message, stack: error.stack }
      );
      process.stderr.write(wrapped.bytecode + "\n");
    }
    process.exit(2);
  }
}

main();
