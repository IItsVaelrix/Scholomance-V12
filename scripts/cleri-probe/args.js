/**
 * Cleri Probe CLI argument parser.
 *
 * Strict, deterministic parsing for the investigation CLI. Unknown options and
 * missing values are reported as PB-ERR-v1 INVALID_FORMAT operational failures.
 */

import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  ERROR_CODES,
  MODULE_IDS
} from "../../codex/core/pixelbrain/bytecode-error.js";

// ─── Option catalog ──────────────────────────────────────────────────────────

const OPTIONS = Object.freeze({
  scope: { type: "array", hasValue: true, target: "scopes" },
  exclude: { type: "array", hasValue: true, target: "excludes" },
  "include-tests": { type: "boolean" },
  "include-generated": { type: "boolean" },
  detector: { type: "array", hasValue: true, target: "detectors" },
  json: { type: "boolean" },
  "plan-only": { type: "boolean" },
  format: { type: "string", hasValue: true },
  output: { type: "string", hasValue: true },
  "include-source": { type: "boolean" },
  "no-cache": { type: "boolean" },
  "no-color": { type: "boolean" },
  "fail-on-findings": { type: "boolean" },
  report: { type: "string", hasValue: true },
  proposal: { type: "string", hasValue: true }
});

const COMMANDS = Object.freeze([
  "investigate",
  "explain",
  "verify",
  "detectors",
  "benchmark",
  "graduate"
]);

const FORMATS = Object.freeze(["human", "json", "bytecode"]);

// ─── Internal helpers ────────────────────────────────────────────────────────

function parseError(message, context = {}) {
  return new BytecodeError(
    ERROR_CATEGORIES.VALUE,
    ERROR_SEVERITY.CRIT,
    MODULE_IDS.IMMUNITY,
    ERROR_CODES.INVALID_FORMAT,
    { message, ...context }
  );
}

function normalizeRepositoryScope(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  let normalized = value.replace(/\\/g, "/");
  normalized = normalized.replace(/\/+/g, "/");
  normalized = normalized.replace(/^\/+/, "");
  normalized = normalized.replace(/^\.\//, "");
  normalized = normalized.replace(/\/$/, "");
  if (normalized === "." || normalized === "") normalized = "";
  const parts = normalized.split("/");
  if (parts.some(part => part === "..")) return null;
  return normalized;
}

function kebabToCamel(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function parseArgs(argv, env = process.env) {
  const args = Array.isArray(argv) ? argv : process.argv.slice(2);

  let command = null;
  const positional = [];
  const options = {
    scopes: [],
    excludes: [],
    detectors: [],
    includeTests: false,
    includeGenerated: false,
    planOnly: false,
    json: false,
    format: "human",
    output: null,
    includeSource: false,
    noCache: false,
    noColor: Boolean(env && env.NO_COLOR),
    failOnFindings: false,
    report: null,
    proposal: null
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (!arg.startsWith("-")) {
      if (!command && COMMANDS.includes(arg)) {
        command = arg;
      } else {
        positional.push(arg);
      }
      continue;
    }

    let key = arg;
    let value = null;
    const equalsIndex = arg.indexOf("=");
    if (equalsIndex !== -1) {
      key = arg.slice(0, equalsIndex);
      value = arg.slice(equalsIndex + 1);
    }

    if (!key.startsWith("--")) {
      throw parseError("Short options are not supported", { argument: arg });
    }

    const name = key.slice(2);
    const descriptor = OPTIONS[name];
    if (!descriptor) {
      throw parseError("Unknown option", { argument: arg });
    }

    if (descriptor.hasValue) {
      if (value === null) {
        if (i + 1 >= args.length || args[i + 1].startsWith("-")) {
          throw parseError("Missing value for option", { argument: arg });
        }
        value = args[i + 1];
        i += 1;
      }

      if (descriptor.type === "array") {
        const target = descriptor.target || kebabToCamel(name);
        options[target].push(value);
      } else {
        options[kebabToCamel(name)] = value;
      }
    } else {
      const target = kebabToCamel(name);
      options[target] = true;
    }
  }

  if (!command) {
    throw parseError("Missing command", { allowed: COMMANDS });
  }

  if (!FORMATS.includes(options.format)) {
    throw parseError("Unsupported format", { format: options.format, allowed: FORMATS });
  }

  const validatedScopes = [];
  for (const scope of options.scopes) {
    const normalized = normalizeRepositoryScope(scope);
    if (normalized === null) {
      throw parseError("Scope is not a repository-relative path", { scope });
    }
    validatedScopes.push(normalized || ".");
  }
  options.scopes = validatedScopes;

  if (command === "investigate") {
    if (positional.length === 0) {
      throw parseError("investigate requires a hypothesis", { command });
    }
  }

  if (command === "explain" || command === "verify") {
    if (positional.length === 0) {
      throw parseError(`${command} requires a finding id`, { command });
    }
    if (!options.report) {
      throw parseError(`${command} requires --report`, { command });
    }
  }

  if (command === "graduate") {
    if (positional.length === 0) {
      throw parseError("graduate requires a finding id", { command });
    }
    if (!options.report) {
      throw parseError("graduate requires --report", { command });
    }
    if (!options.proposal) {
      throw parseError("graduate requires --proposal", { command });
    }
  }

  return {
    command,
    positional,
    options
  };
}
