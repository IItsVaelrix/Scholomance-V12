# The PixelBrain Language
## A Complete White Paper on the Bytecode, Blueprint, and Packet Grammars of Scholomance's Visual Synthesis Engine

## Bytecode Search Code
`SCHOL-ENC-BYKE-SEARCH-WP-PIXELBRAIN-LANGUAGE`

---

**Document ID:** WP-PIXELBRAIN-LANGUAGE-v1
**Status:** Living Document
**Date:** 2026-06-15
**Audience:** Repository owner, AI agents, asset authors, QA engineers, schema authors, future contributors
**Scope:** Every string format, packet shape, blueprint directive, lattice grammar, IR substrate, and verification discipline that constitutes the *PixelBrain language* — the canonical authoring surface for Scholomance's deterministic visual synthesis engine.

**Companion documents:**
- [`PIXELBRAIN_AGENT_OPERATING_MANUAL.md`](./PIXELBRAIN_AGENT_OPERATING_MANUAL.md) — the agent-side contract for the engine
- [`PIXELBRAIN_CONNECTIVE_TISSUE_WHITE_PAPER.md`](./PIXELBRAIN_CONNECTIVE_TISSUE_WHITE_PAPER.md) — the seven-systems connective tissue
- [`SHADER_FORGE_WHITE_PAPER.md`](./SHADER_FORGE_WHITE_PAPER.md) — shader-packet specialization
- [`docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md`](../ByteCode%20Error%20System/01_Bytecode_Error_System_Overview.md) — the foundational error spec this paper extends
- [`docs/ByteCode Error System/02_Error_Code_Reference.md`](../ByteCode%20Error%20System/02_Error_Code_Reference.md) — canonical code table
- [`SCHEMA_CONTRACT.md`](../../Scholomance%20LAW/SCHEMA_CONTRACT.md) — the parent schema contract
- [`VAELRIX_LAW.md`](../../Scholomance%20LAW/VAELRIX_LAW.md) — the sovereign law
- [`docs/scholomance-encyclopedia/PDR-archive/bytecode_blueprint_bridge_pdr.md`](../PDR-archive/bytecode_blueprint_bridge_pdr.md) — the bridge PDR

---

## Table of Contents

1. [Foreword — Why a Language?](#1-foreword--why-a-language)
2. [The Ten Axioms of the PixelBrain Language](#2-the-ten-axioms-of-the-pixelbrain-language)
3. [The Grammar of Strings](#3-the-grammar-of-strings)
4. [The FNV-1a Checksum Discipline](#4-the-fnv-1a-checksum-discipline)
5. [The Base64 Context Discipline](#5-the-base64-context-discipline)
6. [The Bytecode Family Catalog](#6-the-bytecode-family-catalog)
7. [The Blueprint Language (ANIM_START … ANIM_END)](#7-the-blueprint-language-anim_start--anim_end)
8. [The Lattice Coordinate Language](#8-the-lattice-coordinate-language)
9. [The VerseIR Substrate](#9-the-verseir-substrate)
10. [Type Discipline and Strictness Levels](#10-type-discipline-and-strictness-levels)
11. [The Three Laws of PixelBrain Animation](#11-the-three-laws-of-pixelbrain-animation)
12. [The Canonical Rotation Formula](#12-the-canonical-rotation-formula)
13. [Parsing and Tokenization](#13-parsing-and-tokenization)
14. [Generation Patterns (Emitters)](#14-generation-patterns-emitters)
15. [Verification Patterns (Assertions)](#15-verification-patterns-assertions)
16. [Interoperability and Family Relationships](#16-interoperability-and-family-relationships)
17. [Anti-Patterns — What the Language Forbids](#17-anti-patterns--what-the-language-forbids)
18. [Worked Examples](#18-worked-examples)
19. [EBNF Reference Grammar](#19-ebnf-reference-grammar)
20. [Glossary](#20-glossary)
21. [Constant Reference](#21-constant-reference)
22. [Cross-References and External Reading](#22-cross-references-and-external-reading)

---

## 1. Foreword — Why a Language?

The PixelBrain language is not a programming language in the conventional sense. It is a **structured-string language** — a deliberately constrained, fully deterministic, AI-parsable encoding system used to express assets, errors, formulas, predictions, packets, packets-of-packets, animation intents, and visual synthesis state in Scholomance.

It exists because a deterministic engine requires deterministic inputs. The language is the surface at which human intent and machine execution meet without ambiguity.

The language has four faces:

1. **A bytecode surface** — short, dense, checksummed, self-describing strings that name *what just happened* or *what should happen next*. Errors, fixes, predictions, diagnostics, equalizer presets, and shader packets all live here.
2. **A blueprint surface** — readable, line-oriented animation specs that describe motion intent in a way both human authors and the AMP runtime can consume.
3. **A packet surface** — JSON-shaped contracts that carry full state between layers, services, runtimes, servers, and external tools.
4. **A lattice surface** — coordinate pairs that anchor visual synthesis to integer grid positions. The lattice is the asset.

These faces are not separate languages. They are dialects of one language with one set of laws. The laws are the **Ten Axioms** declared in the next section. Every bytecode, every packet, every blueprint line obeys them.

> *"Bytecode is truth. Lattice is law. Symmetry is automatic. Errors are bytecode."*
> — `SHARED_PREAMBLE.md`

If you internalize the axioms and the FNV-1a discipline, you can read, write, and verify every member of the language. This paper is the field manual.

---

## 2. The Ten Axioms of the PixelBrain Language

These axioms are non-negotiable. Every valid construct in the language conforms to all ten.

### Axiom 1 — Bytecode Is Truth

Whenever state must cross a boundary (network, file, runtime layer, agent context), it is encoded as a structured bytecode string or packet first. Renders, previews, and human-readable surfaces are *projections* of bytecode, not sources.

**Implication:** never persist only a PNG. Persist a `PixelBrainAssetPacket` and derive PNG on demand.

### Axiom 2 — Lattice Is Law

Visual geometry lives on an integer-cell grid. Coordinates are integer pairs (and a depth axis when relevant). Color is hex. Part identity is a stable string ID. A pixel is `{x, y, color, partId}` and nothing else.

**Implication:** SVG paths, canvas screenshots, and shader outputs are *projections*. Canonical state is coordinates.

### Axiom 3 — Symmetry Is Automatic

Every authored input is analyzed for inherent symmetry. Mirrored, radial, axial, diagonal, and "none" symmetries are first-class language values, not afterthoughts. A blueprint that does not declare its symmetry is a blueprint that has not been analyzed.

**Implication:** `symmetry: { type: "radial", order: 4 }` is as much part of a complete statement as the duration.

### Axiom 4 — Errors Are Bytecode

Every failure mode — type mismatch, range violation, hook timeout, render context loss, recursion — has a canonical bytecode shape (`PB-ERR-v1-…`). Stack traces are *decorative*; bytecode is the source of truth.

**Implication:** catch sites emit bytecode errors; tests assert on bytecode; agents and humans both parse the same string.

### Axiom 5 — Determinism Is Non-Negotiable

Same input → same output. The language forbids `Math.random()`, timestamp-seeded variation, host-dependent canvas measurement, and unordered iteration that affects output. Allowed: coordinate-hashed noise, FNV-1a hashes, seed-derived formulas, quantized integer trigonometry.

**Implication:** any construct whose evaluation depends on `Date.now()`, ambient memory state, or process ordering is invalid.

### Axiom 6 — Checksum Integrity Is Required

Every bytecode string that crosses a trust boundary carries an 8-digit FNV-1a hex checksum. The checksum is computed over the entire string *minus the checksum field itself*, then suffixed in uppercase hex. A bytecode with a missing or mismatched checksum is *untrusted* and may not be executed.

**Implication:** never log only the prefix; log the full string. Never edit bytecode by hand; regenerate it.

### Axiom 7 — Context Is Base64(JSON)

When a bytecode string needs to carry a payload (error context, fix instructions, prediction context, vaccine metadata), the payload is canonicalized to JSON, UTF-8 encoded, base64 encoded, and inserted as a single field. Decoders must produce the same JSON when the same logical object is encoded.

**Implication:** never put raw JSON in bytecode; always base64 it. Never double-encode.

### Axiom 8 — Versioning Is Explicit

Every bytecode family is suffixed with a version segment (`v1`, `v2`, …). A reader that does not recognize the version must refuse the string. Backward compatibility is *announced* in `SCHEMA_CONTRACT.md`; it is not assumed.

**Implication:** never strip the version field; never substitute a default version silently.

### Axiom 9 — Strictness Is Loud

When a required construct is missing or invalid, the language fails *loudly* with a `FATAL` or `CRIT` severity bytecode error. Warnings are reserved for optional polish. If a foundry emits zero cells for a required part, the run is fatal, not cautionary.

**Implication:** `console.warn` is not a substitute for a bytecode error. The language does not whisper.

### Axiom 10 — The Schema Is Sovereign

If a shape does not exist in `SCHEMA_CONTRACT.md` or this white paper, the construct is invalid. New shapes are published via `SCHEMA CHANGE NOTICE` and absorbed by this paper. Parallel schemas are forbidden by Vaelrix Law 3.

**Implication:** never invent a new bytecode family ad hoc. Request a schema change.

---

## 3. The Grammar of Strings

The language is built from characters. The grammar of those characters is the most important thing in the paper.

### 3.1 The Separator

The separator between every field inside a bytecode string is the **hyphen-minus** (`-`, U+002D). There is exactly one separator character. Whitespace, periods, slashes, colons, equals signs, and underscores are *not* separators (they are reserved for *inside* fields, as we will see).

**Why a single separator?** Because it lets a parser split with one call. It also forces authors to choose unique field names that do not collide with the separator, which keeps the language readable.

### 3.2 The Casing

Field values are **UPPERCASE** when they are enums, fixed tokens, version strings, or hex segments (`v1`, `CRIT`, `IMGPIX`, `3E9895BB`). Field values are **lowercase** when they are free-form slugs, schema ids, or identifiers that humans will read (`scholomance/eq-preset`, `voidsteel`).

The base64 context segment is **case-sensitive** (base64 is a case-sensitive encoding). The hex checksum is conventionally uppercased but must accept both cases during verification.

### 3.3 The Length Discipline

| Field | Maximum length | Reason |
|---|---|---|
| Marker (`PB`, `BIT`, `SCHOL`) | 6 chars | Stable prefix anchors the family |
| Version | 2-3 chars (`v1`, `v2`) | Future-proofs rolling releases |
| Category | 3-8 chars | Enumerated vocabulary |
| Severity | 4-5 chars | `FATAL`, `CRIT`, `WARN`, `INFO` |
| Module | 4-6 chars | Stable short ID |
| Code | 4 hex digits | 65 535 codes per category |
| Context (base64) | variable, but typically ≤ 1 KB | Readability |
| Checksum | 8 hex digits | FNV-1a 32-bit truncated |

The whole string is unbounded in principle but is conventionally **< 1 KB** for inline use. Longer payloads belong in packets.

### 3.4 The Field Vocabulary

| Field shape | Example | Meaning |
|---|---|---|
| `PB-ERR-v1-TYPE-CRIT-IMGPIX-0001-…-3E9895BB` | `PB-ERR` | Two-letter family marker |
| `BIT-EQ-v1-XXXXXXXX` | `BIT` | Alternate family marker for EQ presets |
| `SCHOL-ENC-BYKE-…` | `SCHOL` | Encyclopedia search code marker |
| `pixelbrain.render.v1` | `pixelbrain.*` | Dotted namespace for packet contracts |
| `scholomance/eq-preset` | `scholomance/…` | Slash-namespaced schema id |

The leading marker is a **fingerprint**. A reader that sees `PB-ERR` knows immediately which family and which parser to invoke. A reader that sees `pixelbrain.render.v1` knows it has a JSON packet and a renderer contract.

### 3.5 The Reserved Characters

These characters are reserved for *inside* fields and may not appear in separator positions:

- `_` (underscore) — used in module ids and slug names
- `/` (slash) — used in `schema_id` slash-namespaces
- `.` (period) — used in packet version strings
- `:` (colon) — used in resource URIs (`collab://…`)
- `+`, `=` (plus, equals) — used in standard base64
- `-` (hyphen) — *also* used inside base64 URL-safe variants; the parser must therefore reconstruct the base64 segment by joining all parts after the code and before the checksum

### 3.6 The Lexical Normalization

Before any string is checksummed, the entire prefix (everything except the trailing checksum) is **lexically normalized** by joining with `-`. The base64 segment may contain `-` if URL-safe base64 is used; the parser joins `parts[7 .. length-2]` with `-` to recover it.

```js
// Reconstruction
const partial = parts.slice(0, 7).join('-') + '-' + parts.slice(7, -1).join('-');
const checksum = parts[parts.length - 1];
```

This is the **only** way a parser should split a bytecode string. Never split on the first occurrence of every field delimiter; always split by position from the front and back.

---

## 4. The FNV-1a Checksum Discipline

The checksum is the **semantic anchor** of every bytecode string. It is the only field that is computed rather than authored, and it is what makes a bytecode string trustworthy.

### 4.1 The Algorithm

FNV-1a 32-bit, lowercase-or-uppercase, hex-truncated-to-8-digits.

```js
function fnv1a32(input) {
  const text = String(input ?? '');
  let hash = 0x811c9dc5; // 2166136261 — FNV offset basis
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // 16777619 — FNV prime
  }
  return hash >>> 0; // unsigned 32-bit
}

function fnv1a8Hex(input) {
  return fnv1a32(input).toString(16).toUpperCase().padStart(8, '0');
}
```

The output is always exactly 8 hex characters, zero-padded, uppercase. Inputs of zero length produce `811C9DC5` (the offset basis itself).

### 4.2 What Is Hashed

**The hash is computed over the entire bytecode prefix — every character from the first `P` (or other marker) up to and including the last character of the base64 context segment, but excluding the separator and checksum fields that follow.**

In other words: the hash covers the `category`, `severity`, `module`, `code`, and `contextB64` segments after they are joined with `-`. The marker (`PB`, `BIT`, `SCHOL`) and version (`v1`) *are included* in the hashed prefix. This means a checksum of `PB-ERR-v1-TYPE-CRIT-IMGPIX-0001-{B64}` is computed over the literal string `PB-ERR-v1-TYPE-CRIT-IMGPIX-0001-{B64}`.

```js
const partial = `PB-ERR-v1-TYPE-CRIT-IMGPIX-0001-${contextB64}`;
const expected = fnv1a8Hex(partial);
```

### 4.3 Why FNV-1a

- **Non-cryptographic.** FNV-1a is fast and good enough for integrity, not authentication. The language does not pretend to be a security primitive.
- **Deterministic across platforms.** No endianness issues, no platform-specific overflow.
- **Distribution.** FNV-1a distributes well enough for collisions to be rare in practice; the language is not a hash table.
- **Tiny footprint.** 8 hex characters are enough to catch all accidental corruption.

### 4.4 What the Checksum Catches

- A typo in any field.
- A truncated string.
- A character-substitution attack.
- A failed concatenation after partial serialization.

It does **not** catch:

- An intentional rewrite of the entire string (the attacker recomputes the checksum).
- A semantically valid but factually wrong context payload (the checksum is structural, not semantic).

For semantic verification, parse the context and assert against the schema.

### 4.5 Checksum Discipline

| Rule | Reason |
|---|---|
| Compute the checksum on the canonical, JSON-normalized form of the context payload | Two equivalent JS objects can serialize differently (`{a:1,b:2}` vs `{b:2,a:1}`); canonicalize first |
| Always uppercase the hex | Stable cross-platform |
| Always zero-pad to 8 characters | `00000001`, not `1` |
| Refuse to execute strings with checksum `00000000` unless explicitly produced by an empty input | This is a sentinel for "hashing failed"; surface it loudly |
| Never trim the checksum from logs | The whole string is the truth |
| Never compute a checksum over a string that already contains a checksum | Double-hashing breaks verification |

---

## 5. The Base64 Context Discipline

The context segment is the only part of a bytecode string that is opaque to humans. It is a self-describing JSON object, encoded once, embedded once.

### 5.1 The Canonicalization Order

Before encoding, the context object is canonicalized:

1. Keys are sorted in **lexicographic order** (Unicode codepoint order).
2. Nested objects are canonicalized recursively.
3. Arrays preserve their order (arrays are not sorted).
4. Numbers are emitted without trailing zeros; `null` is `null`; booleans are `true`/`false`; strings are UTF-8.

This guarantees that two semantically equivalent objects produce byte-identical base64.

```js
function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}';
}
```

### 5.2 The Encoding

The canonical JSON string is UTF-8 encoded, then base64 encoded. **Standard base64** is the default. **URL-safe base64** is allowed when the bytecode will be embedded in a URL or filesystem path. The choice is documented in the context schema, not inferred.

```js
function encodeContext(obj) {
  const json = canonicalize(obj);
  return Buffer.from(json, 'utf8').toString('base64');
}
```

### 5.3 The Decoding

```js
function decodeContext(b64) {
  // URL-safe -> standard
  const safe = b64.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(safe, 'base64').toString('utf8');
  return JSON.parse(json);
}
```

### 5.4 What Goes In

The context schema is **per category**. Every category declares a `requiredFields` list; missing fields are a schema violation, not a partial decode. Examples:

| Category | Required fields |
|---|---|
| `TYPE` | `parameterName`, `expectedType`, `actualType` |
| `VALUE` | `providedValue`, `allowedValues` |
| `RANGE` | `value`, `min`, `max` |
| `STATE` | `currentState`, `expectedState`, `operation` |
| `COORD` | `coords`, `bounds` |
| `COLOR` | `colorValue`, `expectedFormat` |
| `LATTICE` | `x`, `y`, `partId` (when applicable) |
| `SHADER` | `targetId`, `missingField` |

The full catalog is in the family-specific sections below.

### 5.5 What Does Not Go In

- Secrets, tokens, keys.
- Personally identifying information.
- Rendered outputs (PNGs, base64 images, etc.).
- Long-form prose. Use `commentary` (≤ 280 chars) for human notes.

---

## 6. The Bytecode Family Catalog

Each family has a **purpose**, a **grammar**, a **canonical example**, a **decoded example**, an **invariants list**, and **emission rules**. Read this section once and you have learned the language.

### 6.1 `PB-ERR-v1` — the error tongue

**Purpose:** Encode a failure mode structurally so that humans, agents, and CI can all parse it identically.

**Grammar (EBNF, simplified):**

```
PB-ERR-v1   = "PB-ERR-v1" "-" CATEGORY "-" SEVERITY "-" MODULE "-" CODE "-" CONTEXT_B64 "-" CHECKSUM
CATEGORY    = "TYPE" | "VALUE" | "RANGE" | "STATE" | "HOOK" | "EXT" | "COORD" | "COLOR" | "NOISE" | "RENDER" | "CANVAS" | "FORMULA" | "LINGUISTIC" | "COMBAT" | "UI_STASIS" | "LATTICE" | "SHADER" | "SCHEMA"
SEVERITY    = "FATAL" | "CRIT" | "WARN" | "INFO"
MODULE      = [A-Z0-9]{3,6}                       ; short module identifier
CODE        = 4 * HEXDIGIT                        ; e.g. "0001", "0C03"
CONTEXT_B64 = 1*( ALPHA / DIGIT / "+" / "/" / "=" / "-" / "_" )
CHECKSUM    = 8 * HEXDIGIT
```

**Severity ladder:**

| Severity | Meaning | Reaction |
|---|---|---|
| `FATAL` | Process cannot continue. Bail out. | Throw, never recover inline. |
| `CRIT` | Subsystem cannot continue. Bubble up. | Re-emit, refuse the input. |
| `WARN` | Degraded behavior; tolerable. | Log + flag, continue. |
| `INFO` | Diagnostic; not an error. | Log only. |

**Canonical category table:**

| Category | Hex range | Meaning |
|---|---|---|
| `TYPE` | `0x0000`-`0x00FF` | Type mismatch, null input, undefined property |
| `VALUE` | `0x0100`-`0x01FF` | Invalid enum, format, missing required |
| `RANGE` | `0x0200`-`0x02FF` | Out of bounds, exceeds max, below min |
| `STATE` | `0x0300`-`0x03FF` | Invalid state, lifecycle, race |
| `HOOK` | `0x0400`-`0x04FF` | Hook not fn, hook timeout, chain break |
| `EXT` | `0x0500`-`0x05FF` | Extension duplicate / missing / conflict |
| `COORD` | `0x0600`-`0x06FF` | Invalid coordinate, out of bounds, transform fail |
| `COLOR` | `0x0700`-`0x07FF` | Invalid hex, invalid HSL, color/byte mismatch |
| `NOISE` | `0x0800`-`0x08FF` | Invalid noise params, overflow |
| `RENDER` | `0x0900`-`0x09FF` | Context lost, invalid size, render failed |
| `CANVAS` | `0x0A00`-`0x0AFF` | Canvas not found, zero size |
| `FORMULA` | `0x0B00`-`0x0BFF` | Parse / eval / syntax fail |
| `LINGUISTIC` | `0x0C00`-`0x0CFF` | Phonemic saturation, resonance, meter |
| `COMBAT` | `0x0D00`-`0x0DFF` | Force dissipation, entropic repetition, mana void |
| `UI_STASIS` | `0x0E00`-`0x0EFF` | Click stall, RAF orphan, listener leak |
| `LATTICE` | `0x0F00`-`0x0FFF` | Reserved for lattice-level invariants |
| `SHADER` | `0x1000`-`0x10FF` | Reserved for shader-packet errors |
| `SCHEMA` | `0x1100`-`0x11FF` | Reserved for schema-contract violations |

**Module ids in current use:**

| Module id | Owner | Use |
|---|---|---|
| `IMGPIX` | PixelBrain image pixel engine | `RENDER`/`CANVAS` errors |
| `IMGFOR` | PixelBrain formula engine | `FORMULA` errors |
| `COORD` | PixelBrain coordinate mapper | `COORD` errors |
| `COLBYT` | PixelBrain color bytecode | `COLOR` errors |
| `NOISE` | PixelBrain noise engine | `NOISE` errors |
| `GEARGL` | Gear glide AMP | `STATE` errors |
| `LINGUA` | Linguistic analyzer | `LINGUISTIC` errors |
| `COMBAT` | Combat resolver | `COMBAT` errors |
| `UISTAS` | UI stasis guard | `UI_STASIS` errors |
| `EXTREG` | Extension registry | `HOOK`/`EXT` errors |
| `SHARED` | Shared test harness | QA-emitted `STATE` errors |
| `EQPRE` | EQ preset codec | `SCHEMA`/`VALUE` errors |
| `LATTICE` | Lattice grid engine | `LATTICE` errors |
| `SHADER` | Shader packet engine | `SHADER` errors |
| `SCHEMA` | Schema contract guard | `SCHEMA` errors |

**Canonical example:**

```text
PB-ERR-v1-TYPE-CRIT-IMGPIX-0001-eyJwYXJhbWV0ZXJOYW1lIjoicGl4ZWxEYXRhIiwiZXhwZWN0ZWRUeXBlIjoic3RyaW5nIiwiYWN0dWFsVHlwZSI6Im51bWJlciJ9-3E9895BB
```

**Decoded:**

```json
{
  "marker": "PB-ERR",
  "version": "v1",
  "category": "TYPE",
  "severity": "CRIT",
  "module": "IMGPIX",
  "code": "0x0001",
  "codeName": "TYPE_MISMATCH",
  "context": {
    "parameterName": "pixelData",
    "expectedType": "string",
    "actualType": "number"
  },
  "checksum": "3E9895BB",
  "checksumVerified": true
}
```

**Invariants:**

- `parameterName` is non-empty and is the name of the *argument*, not the value.
- `expectedType` is one of the JS typeof results or a domain-specific type (`'integer'`, `'hexColor'`, `'bytecode'`).
- `actualType` is never `undefined`; if a value is undefined, the correct error is `UNDEFINED_PROP` (`0x0003`).
- The full string is reproducible from the decoded object using `encodeError(obj)`.

**Emission rules:**

- Always throw a `BytecodeError` from the engine; never `throw new Error("...")`.
- Always include enough context for the recovery hint to be derivable.
- Always run the new error through `tests/qa/tools/bytecode-assertions.js` round-trip.

### 6.2 `PB-FIX-v1` — the solution tongue

**Purpose:** Record a known-good fix recipe in the same bytecode surface so a CI healer, an AI agent, or a future human can apply it without rediscovering the cure.

**Grammar:**

```
PB-FIX-v1   = "PB-FIX-v1" "-" CATEGORY "-" OP "-" CODE "-" CONTEXT_B64 "-" CHECKSUM
OP          = [a-z0-9_]{3,32}    ; verb describing the fix action
```

The `CATEGORY` and `CODE` mirror the `PB-ERR-v1` they cure. The `OP` is a stable verb from the fix vocabulary.

**Fix vocabulary (canonical verbs):**

| Verb | Meaning |
|---|---|
| `validate_type` | Add `typeof` / schema guard before use |
| `clamp` | Clamp a numeric value to `[min, max]` |
| `default_value` | Substitute a default when input is missing |
| `coerce` | Apply a coercion (Number, String, …) |
| `register` | Add an entry to a registry before use |
| `unregister` | Remove a stale entry |
| `await` | Await a promise before access |
| `normalize` | Apply canonical normalization |
| `assert_invariant` | Insert a runtime invariant assertion |
| `switch_state` | Move state machine to a valid next state |
| `fallback` | Use a fallback path declared in the context |
| `retry` | Retry with backoff (declarative; not a verb) |
| `noop` | Acknowledge the error; no action required |
| `rebuild_artefact` | Regenerate the artefact from source |
| `reseed` | Apply a deterministic seed and re-derive |

**Canonical example:**

```text
PB-FIX-v1-TYPE-validate_type-0001-eyJwYXJhbWV0ZXJOYW1lIjoicGl4ZWxEYXRhIiwiZXhwZWN0ZWRUeXBlIjoic3RyaW5nIiwib3AiOiJWQUxJREFURV9UWVBFIn0=-3E733C19
```

**Decoded:**

```json
{
  "marker": "PB-FIX",
  "version": "v1",
  "category": "TYPE",
  "op": "validate_type",
  "code": "0x0001",
  "context": {
    "parameterName": "pixelData",
    "expectedType": "string",
    "op": "VALIDATE_TYPE"
  },
  "checksum": "3E733C19"
}
```

**Coupling rule:** A `PB-FIX-v1` is the cure for a `PB-ERR-v1`. The cure is *traceable*: given a fix, you can find every error it closes, and given an error, you can find the candidate fix. The Cleric-Raid substrate stores these pairs as `Pattern → Cure` records.

### 6.3 `PB-RECURSE-v1` — the recursion detector

**Purpose:** Mark an entity (function, hook, callback, route) that has been observed entering a recursive cycle. Used by the immune system to seal infinite loops.

**Grammar:**

```
PB-RECURSE-v1 = "PB-RECURSE-v1" "-" ENTRYPOINT "-" DEPTH "-" STACK_HASH "-" CHECKSUM
ENTRYPOINT    = [a-zA-Z0-9_.]{3,64}     ; function name, file, or route
DEPTH         = 1*5DIGIT                ; observed depth, e.g. "00042"
STACK_HASH    = 8HEXDIGIT               ; FNV-1a of normalized stack trace
```

**Canonical example:**

```text
PB-RECURSE-v1-hook.useEffect-00042-9F2A13B7-3D7E1A22
```

**Decoded:**

```json
{
  "marker": "PB-RECURSE",
  "version": "v1",
  "entrypoint": "hook.useEffect",
  "depth": 42,
  "stackHash": "9F2A13B7",
  "checksum": "3D7E1A22"
}
```

**Invariants:**

- `depth >= 1`.
- `stackHash` is the FNV-1a of the normalized stack frame list, joined with `|`.
- A `PB-RECURSE-v1` is a `FATAL` situation by default; the runtime must break the cycle.
- Recursion records are submitted to the immune system and become *antigens* — recognizable patterns that future regressions are matched against.

### 6.4 `PB-XP-v1` — the vaccine / antigen tongue

**Purpose:** Persist an *antigen* — a recognized code pattern with a known cure — into the immune system. XP stands for *bytecode experience*: a learned lesson the engine carries forward.

**Grammar:**

```
PB-XP-v1 = "PB-XP-v1" "-" SOURCE_KIND "-" SLUG "-" FINGERPRINT "-" CHECKSUM
SOURCE_KIND   = "error" | "health" | "cccb"
SLUG          = [a-z0-9-]{3,64}
FINGERPRINT   = 16HEXDIGIT
```

**Field semantics:**

| Field | Meaning |
|---|---|
| `SOURCE_KIND` | Where the antigen came from |
| `SLUG` | Stable semantic name (kebab/snake) |
| `FINGERPRINT` | Truncated hash of the original bytecode's identifying prefix |
| `CHECKSUM` | FNV-1a over the full prefix |

**Source kinds:**

| Kind | Origin |
|---|---|
| `error` | A `PB-ERR-v1` was fixed and the cure recorded |
| `health` | A passing health signal was promoted to memory |
| `cccb` | A Cleri-Cluster Cleri-Cure Binding: a bundled family of antigens with a shared cure |

**Canonical example:**

```text
PB-XP-v1-error-type-mismatch-pixeldata-AB12CD34EF567890-A1B2C3D4
```

**Decoded:**

```json
{
  "marker": "PB-XP",
  "version": "v1",
  "sourceKind": "error",
  "slug": "type-mismatch-pixeldata",
  "fingerprint": "AB12CD34EF567890",
  "checksum": "A1B2C3D4"
}
```

**Operational loop:**

1. Engine observes an error and emits a `PB-ERR-v1`.
2. Operator or AI fixes the root cause and emits a `PB-FIX-v1`.
3. A `PB-XP-v1` envelope is created that references the original error and the cure.
4. The envelope is wrapped in a `SCHOL-BYTXP-MEM-v1` memory artifact and stored.
5. Future regressions are matched by fingerprint; on match, the cure is applied.

### 6.5 `PB-PRED-v1` — the ritual prediction tongue (reserved)

**Purpose:** Persist or share a ritual prediction artifact. Reserved for future cross-process and cross-agent transport; current implementations exchange structured `RitualPredictionArtifact` objects in-process.

**Grammar (forward-looking):**

```
PB-PRED-v1 = "PB-PRED-v1" "-" REQUEST_HASH "-" TRACE_CHECKSUM "-" CHECKSUM
REQUEST_HASH    = 16HEXDIGIT
TRACE_CHECKSUM  = 16HEXDIGIT
```

**Canonical example (placeholder):**

```text
PB-PRED-v1-A1B2C3D4E5F60718-9F8E7D6C5B4A3210-12345678
```

**Reservation status:** the family is **reserved**. Do not emit `PB-PRED-v1` strings in production code until the transport layer is ratified. Runtime callers continue to use `RitualPredictionArtifact` objects and structured envelopes.

### 6.6 `PB-DIAG-v1` — the diagnostic report tongue

**Purpose:** Encode the result of a diagnostic scan as a single string. Used by the agent immune system to log full scan results to control-plane memory.

**Grammar:**

```
PB-DIAG-v1 = "PB-DIAG-v1" "-" TIMESTAMP "-" RAND4 "-" CONTEXT_B64 "-" CHECKSUM
TIMESTAMP   = 1*15DIGIT              ; epoch milliseconds
RAND4       = 4 * HEXDIGIT           ; random suffix for collision avoidance
```

**Canonical example:**

```text
PB-DIAG-v1-1718448000123-4F2A-{CONTEXT_B64}-9F2A13B7
```

**Decoded:**

```json
{
  "marker": "PB-DIAG",
  "version": "v1",
  "timestamp": 1718448000123,
  "rand": "4F2A",
  "context": { /* diagnostic report body */ },
  "checksum": "9F2A13B7"
}
```

**Why a random suffix:** concurrent scans can produce the same timestamp; the random suffix disambiguates without sacrificing temporal ordering.

### 6.7 `BIT-EQ-v1` — the equalizer preset tongue

**Purpose:** Identify a ScholoCandy EQ preset uniquely. Used as a manifest entry in saved presets and as a stable handle in user-facing UI.

**Grammar:**

```
BIT-EQ-v1 = "BIT-EQ-v1" "-" CRC32
CRC32      = 8 * HEXDIGIT            ; zero-padded, uppercase
```

**Canonical example:**

```text
BIT-EQ-v1-2D61560F
```

**Decoded:**

```json
{
  "marker": "BIT-EQ",
  "version": "v1",
  "crc32": "2D61560F",
  "checksum": null  // CRC32 doubles as the integrity hash
}
```

**Why CRC32 and not FNV-1a:** EQ preset bitmaps are short, fixed, and benefit from hardware-accelerated CRC32 in the Rust backend. The CRC is a content hash, not a checksum in the FNV-1a sense.

**Coupling:** The `BIT-EQ-v1` string is the `bytecode` field of a `ScholoCandyEqPreset` (see §6.15). It is derived from the canonical serialization of the preset's bands, gain, and analyzer config.

### 6.8 `0xF`-prefixed formulas — the pixel-art math tongue

**Purpose:** Describe a pixel-art transformation as a pure function in a tiny, deterministic mathematical syntax. Used as the canonical representation behind `image-to-bytecode-formula` and `formula-to-coordinates`.

**Grammar:**

```
FORMULA = "0xF" ":" KIND ":" BODY
KIND    = "1d" | "2d" | "noise" | "sdf" | "trig" | "composite" | "morph" | "fill"
BODY    = expression, kind-specific
```

**Kinds:**

| Kind | Body shape | Example |
|---|---|---|
| `1d` | `f(x) = a*x + b` | `0xF:1d:f(x)=2*x+1` |
| `2d` | `g(x,y) = a*x + b*y + c` | `0xF:2d:g(x,y)=0.5*x+0.5*y+0` |
| `noise` | `n(x,y,seed) = hash(x*prime_x + y*prime_y + seed)` | `0xF:noise:n(x,y,s)=fnv1a(x*73+y*131+s)` |
| `sdf` | `sdf(p) = length(p - center) - radius` | `0xF:sdf:s(p)=length(p-vec2(32,32))-8` |
| `trig` | `t(t) = sin(2π*t/period)*amplitude+offset` | `0xF:trig:t(t)=sin(2*pi*t/800)*0.5+0.5` |
| `composite` | `c(a,b) = a OP b` for OP ∈ {max,min,add,mul,sub,and,or,xor} | `0xF:composite:c(a,b)=max(a,b)` |
| `morph` | `m(a,b,t) = a*(1-t)+b*t` | `0xF:morph:m(a,b,t)=a*(1-t)+b*t` |
| `fill` | bounded region fill, see `region-fill-amp` | `0xF:fill:region(0,0,16,16,material=voidsteel)` |

**Canonical example:**

```text
0xF:trig:t(t)=sin(2*pi*t/800)*0.05+1.0
```

This formula is the *scale envelope* of an orb pulse. It compiles to the bytecode blueprint block:

```text
SCALE BASE 1.0 PEAK 1.05
```

and the runtime evaluation `1.0 + 0.05 * sin(2*π*t/800)`.

**Determinism rules:**

- Constants must be literals; no `Math.random`, no `Date.now`.
- Functions must be from a fixed library (`sin`, `cos`, `tan`, `length`, `normalize`, `floor`, `ceil`, `clamp`, `fnv1a`, `mix`, `step`, `smoothstep`).
- Operator precedence is canonical: `*` `/` before `+` `-`. Use parentheses liberally to make precedence explicit.

### 6.9 `PB-SHADER-v1` — the shader packet tongue

**Purpose:** Carry a portable shader behavior contract between the Shader Forge UI, the PixelBrain runtime, the Phaser renderer, and the Godot bridge.

**Grammar:**

```
PB-SHADER-v1 = "PB-SHADER-v1" "-" SHA256_PREFIX "-" CHECKSUM
SHA256_PREFIX = 8HEXDIGIT              ; first 4 bytes of sha256
```

**Canonical example:**

```text
PB-SHADER-v1-A1B2C3D4-3F2E1D0C
```

**Decoded (envelope shape):**

```json
{
  "contract": "PB-SHADER-v1",
  "schemaVersion": "1.0.0",
  "shaderId": "icy_fire",
  "geometry": { "mask": "GLOW_FIELD", "anchors": [...] },
  "uniforms": [ { "id": "time", "type": "FLOAT", "default": 0 } ],
  "stages": [ { "kind": "FRAGMENT", "name": "main", "ops": [...] } ],
  "checksum": "3F2E1D0C",
  "fingerprint": "A1B2C3D4"
}
```

**Invariants:**

- A shader must consume a geometry mask; it never invents geometry.
- A shader's mask must align with the geometry AMP's output.
- Stages are declarative; the runtime decides how to compile them (GLSL, WGSL, or CPU fallback).

### 6.10 `PB-CONSTRUCTION-SKELETON-v1` — the construction-line tongue

**Purpose:** Mark an asset as carrying a construction skeleton (center, axes, rings, radials, anchors, bounds) and identify the skeleton's vocabulary.

**Grammar:**

```
PB-CONSTRUCTION-SKELETON-v1 = "PB-CONSTRUCTION-SKELETON-v1" "-" SKELETON_ID "-" HASH "-" CHECKSUM
SKELETON_ID  = [a-z0-9-]{3,64}
HASH         = 8HEXDIGIT
```

**Canonical example:**

```text
PB-CONSTRUCTION-SKELETON-v1-orb-transmission-pulse-7F2A13B6-3D7E1A22
```

**Decoded (envelope shape):**

```json
{
  "contract": "PB-CONSTRUCTION-SKELETON-v1",
  "skeletonId": "orb-transmission-pulse",
  "center": { "x": 32, "y": 32 },
  "rings": [ { "radius": 5, "role": "top-crystal" } ],
  "radials": { "count": 8, "offsetDegrees": 22.5 },
  "axes": true,
  "anchors": [ { "id": "core", "x": 32, "y": 32, "role": "origin" } ],
  "bounds": { "width": 64, "height": 64, "gridSize": 1 },
  "hash": "7F2A13B6",
  "checksum": "3D7E1A22"
}
```

**Promotion rule:** Construction cells are reference layers. They do not count as final art unless explicitly promoted to coordinates by a downstream AMP.

### 6.11 `PB-SHAPE-GRAMMAR-v1` — the shape-grammar tongue

**Purpose:** Mark an asset as the result of a shape-grammar expansion. A grammar is a deterministic rule set that turns high-level class intent (`armor.chestplate.sovereign-v1`) into required outputs and route seams.

**Grammar:**

```
PB-SHAPE-GRAMMAR-v1 = "PB-SHAPE-GRAMMAR-v1" "-" GRAMMAR_ID "-" EXPANSION_HASH "-" CHECKSUM
GRAMMAR_ID     = [a-z0-9.-]{3,96}
EXPANSION_HASH = 16HEXDIGIT
```

**Canonical example:**

```text
PB-SHAPE-GRAMMAR-v1-armor.chestplate.sovereign-v1-A1B2C3D4E5F60718-12345678
```

**Decoded (envelope shape):**

```json
{
  "contract": "PB-SHAPE-GRAMMAR-v1",
  "grammarId": "armor.chestplate.sovereign-v1",
  "expansionHash": "A1B2C3D4E5F60718",
  "rules": [
    { "id": "emit-body", "kind": "PART", "profile": "armor.chestplate.void_royal_human" },
    { "id": "emit-trim", "kind": "TRIM", "mirror": "STRICT", "anchor": "body" }
  ],
  "requiredOutputs": [
    { "partId": "body", "minCells": 1024 },
    { "partId": "trim", "minCells": 96 }
  ],
  "seamContracts": [ ... ],
  "checksum": "12345678"
}
```

**Strict-mirror rule:** a grammar may declare a part `mirror: "STRICT"`. If the mirrored part emits cells on one side only, the run is **FATAL**.

### 6.12 `pixelbrain.render.v1` / `pixelbrain.export.v1` — packet carriers

**Purpose:** Identify the schema of a JSON packet that crosses a render or export boundary.

**Format:** These are *not* encoded strings; they are **schema identifier strings** that appear as `schema` or `contract` fields in JSON.

**Canonical JSON shape (render packet):**

```json
{
  "schema": "pixelbrain.render.v1",
  "schemaVersion": "1.0.0",
  "sourceBytecode": "VW-VOID-WILL-SONIC-TRANSCENDENT",
  "material": "icy_fire",
  "coordinates": [
    { "x": 32, "y": 32, "color": "#FFF4B8", "partId": "core" }
  ],
  "palettes": [
    { "key": "source", "colors": ["#FFF4B8"] }
  ],
  "manifest": { "width": 64, "height": 64, "gridSize": 1 },
  "diagnostics": []
}
```

**Canonical JSON shape (export packet):**

```json
{
  "schema": "pixelbrain.export.v1",
  "schemaVersion": "1.0.0",
  "format": "json",
  "material": "source",
  "coordinates": [ ... ],
  "palettes": [ ... ],
  "metadata": { "sourceBytecode": "...", "fingerprint": "..." },
  "diagnostics": []
}
```

**Rules:**

- Render packets may *change* displayed colors (material transmutation). They must not mutate the source packet.
- Export packets are immutable snapshots; their fingerprint is the SHA-256 of the canonicalized JSON.

### 6.13 `SCHOL-BYTXP-MEM-v1` — the memory envelope

**Purpose:** Wrap a `PB-XP-v1` antigen (and its associated QBIT pulse and probe enrichment) into a storable memory artifact for the control plane.

**Grammar (identifier):**

```
SCHOL-BYTXP-MEM-v1 = "SCHOL-BYTXP-MEM-v1"
```

This family uses a *named-schema* identifier (no inline checksum), because the artifact is JSON and is checksummed at the JSON level (SHA-256 of canonical form).

**Canonical JSON shape:**

```json
{
  "schema": "SCHOL-BYTXP-MEM-v1",
  "artifactKind": "BYTECODE_XP_MEMORY_INFUSION",
  "memoryKey": "scholomance:bytecode-xp:{vaccineId}",
  "vaccine": { /* BytecodeXPVaccineArtifact */ },
  "pulse": { /* QbitPulseNodeArtifact or null */ },
  "enrichment": { /* QbitProbeEnrichmentArtifact or null */ },
  "labels": ["linguistic", "phonemic", "meter"],
  "provenance": {
    "source": "codex/core/pixelbrain/bytecode-error.js",
    "pdr": "bytecode_blueprint_bridge_pdr.md",
    "phase": "POST_FIX",
    "createdBy": "codex-architect"
  },
  "checksum": "<sha256-of-canonical-form>"
}
```

**Memory key rule:** the key is namespaced `scholomance:bytecode-xp:{vaccineId}` to allow O(1) lookup and to prevent collisions with non-XP memory.

### 6.14 `ITEM-SPEC-v1` — the item-forging spec tongue

**Purpose:** Express a procedural item to be forged in the PixelBrain item foundry. The spec is the *human-readable* source; the foundry compiles it into a bundle of coordinates, materials, shaders, geometry, and export artefacts.

**Identifier (within the JSON):**

```json
{ "contract": "ITEM-SPEC-v1" }
```

**Canonical JSON shape:**

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "void.chestplate.sovereign.v1",
  "class": "armor",
  "archetype": "chestplate",
  "canvas": { "width": 64, "height": 80, "gridSize": 1 },
  "seed": 110731,
  "bytecode": "VW-VOID-WILL-SONIC-TRANSCENDENT",
  "parts": [
    {
      "id": "body",
      "profile": "armor.chestplate.void_royal_human",
      "fill": { "material": "voidsteel", "intensity": "dark" },
      "trim": { "material": "void_gold", "anchor": "body" }
    }
  ],
  "required": [ "body", "trim" ],
  "strict": [ "trim.mirror" ]
}
```

**Required outputs (returned by the foundry):**

| Key | Type | Meaning |
|---|---|---|
| `spec` | the input spec | Echoed for round-trip |
| `silhouette` | cell list | Occupied lattice cells |
| `template` | cell list | Editable template |
| `construction` | PB-CONSTRUCTION-SKELETON-v1 | Guides |
| `fills` | region map | Material/color authority |
| `motifs` | motif list | Heraldry, engravings |
| `geometry` | PB-GEOMETRY-AMP-v1 | Final part bounds and roles |
| `shader` | PB-SHADER-v1 | Effect |
| `assetPacket` | pixelbrain.render.v1 | Canonical source |
| `sharpness` | metric | AA quality |
| `fidelity` | metric | Render fidelity |
| `routeDiagnostics` | diagnostic list | Route seam results |
| `expansion` | grammar envelope | Shape grammar result |
| `godotArtifact` | `.pbrain` payload | Godot export |
| `godotShader` | GLSL/WGSL string | Godot shader |
| `phaserPipeline` | Phaser config | Phaser export |
| `png` | base64 PNG | Optional preview |

**Loud failure:** If any key in `required` is missing, the run is **FATAL**. If any key in `strict` violates its constraint (e.g., a strict mirror emits one side only), the run is **FATAL**.

### 6.15 `scholomance/eq-preset` v2 — the formal preset schema

**Purpose:** The v2 EQ preset is the canonical artifact for the ScholoCandy DSP plugin. Version 2 is encoded in Rust and uses base32/sha256/crc32 checksums.

**Identifier:**

```json
{ "version": 2, "schema_id": "scholomance/eq-preset" }
```

**Canonical JSON shape:**

```json
{
  "version": 2,
  "schema_id": "scholomance/eq-preset",
  "name": "Icy Fire",
  "school": "SONIC",
  "output_gain_db": -3.0,
  "bands": [
    {
      "id": "band_ABCDEFGH",
      "type": "bell",
      "frequency": 1000,
      "gain": 2.5,
      "Q": 1.0,
      "channel": "stereo",
      "oversample": "2x",
      "bypass": false
    }
  ],
  "oversample": "2x",
  "analyzer": { "enabled": true, "peak_hold_ms": 1500 },
  "bytecode": "BIT-EQ-v1-2D61560F",
  "checksum": "<64-char sha256>"
}
```

**Filter types (v2):**

- `bell`, `lowShelf`, `highShelf`, `lowPass`, `highPass`, `notch` (carried over)
- `bandPass`, `allPass`, `tilt` (added in v2)

**Channel modes:** `left`, `right`, `stereo`, `mid`, `side`.

**Oversample modes:** `1x`, `2x`, `4x`, `8x`, `auto`.

**Band id rule:** `band_{base32}` where `base32` is the first 8 characters of the base32-encoded sha256 of the band's canonical serialization. The id is stable, derived, and unique.

**Bytecode rule:** `bytecode` field is `BIT-EQ-v1-{crc32}` and is recomputed from `bands + output_gain_db + oversample + analyzer` (in that order).

**Checksum rule:** `checksum` is the 64-character sha256 of the entire canonical JSON (excluding the `checksum` field itself).

---

## 7. The Blueprint Language (ANIM_START … ANIM_END)

The blueprint language is a line-oriented DSL for declaring animation intent. It is the *source*; the compiler turns it into canonical IR (a `TruesightCompilerDescriptor`-shaped object); the AMP runtime evaluates the IR against absolute time.

### 7.1 The Block Skeleton

```text
ANIM_START
  <directive>*
ANIM_END
```

`ANIM_START` and `ANIM_END` are reserved keywords. They are **case-sensitive** and must appear on their own line.

### 7.2 The Directive Vocabulary

| Directive | Required | Meaning |
|---|---|---|
| `ID <slug>` | yes | Unique identifier for the animation |
| `TARGET id <part-id>` | conditional | The lattice part the animation drives |
| `DURATION <ms>` | yes | Total envelope duration in milliseconds |
| `EASE TOKEN <token>` | yes | Easing function identifier |
| `SCALE BASE <f> PEAK <f>` | optional | Scale envelope |
| `GLOW BASE <f> PEAK <f>` | optional | Glow envelope |
| `FLICKER BASE <f> PEAK <f> HZ <f>` | optional | Flicker envelope |
| `OPACITY BASE <f> PEAK <f>` | optional | Opacity envelope |
| `ROTATION BPS <bpm> DEG <deg>` | optional | Rotation rate |
| `SYMMETRY TYPE <type> ORDER <n>` | conditional | Symmetry hint |
| `REPEAT <count\|forever>` | optional | Loop count |
| `DELAY <ms>` | optional | Pre-roll delay |
| `COMPOSITE <op>` | optional | Blend with another envelope |

### 7.3 Easing Tokens

| Token | Formula |
|---|---|
| `LINEAR` | `f(t) = t` |
| `IN_OUT_ARC` | `f(t) = sin(πt - π/2) * 0.5 + 0.5` |
| `IN_QUAD` | `f(t) = t * t` |
| `OUT_QUAD` | `f(t) = 1 - (1 - t) * (1 - t)` |
| `IN_OUT_QUAD` | piecewise in/out quad |
| `IN_CUBIC`, `OUT_CUBIC`, `IN_OUT_CUBIC` | cubic variants |
| `SNAP` | `f(t) = step(0.5, t)` |
| `STEP_<n>` | n-step staircase |

### 7.4 Symmetry Types

| Type | Description |
|---|---|
| `none` | No symmetry; full cell set |
| `horizontal` | Mirror across horizontal axis |
| `vertical` | Mirror across vertical axis |
| `diagonal` | Mirror across diagonal |
| `radial` | n-fold rotational symmetry |

### 7.5 Canonical Example

```text
ANIM_START
ID orb-transmission-pulse
TARGET id player-orb
DURATION 800
EASE TOKEN IN_OUT_ARC
SCALE BASE 1.0 PEAK 1.05
GLOW BASE 0.0 PEAK 0.5
FLICKER BASE 0.0 PEAK 0.1 HZ 8.0
SYMMETRY TYPE radial ORDER 4
REPEAT forever
ANIM_END
```

### 7.6 Compiled Form

```json
{
  "id": "orb-transmission-pulse",
  "target": "player-orb",
  "duration": 800,
  "ease": "IN_OUT_ARC",
  "scale": { "base": 1.0, "peak": 1.05 },
  "glow": { "base": 0.0, "peak": 0.5 },
  "flicker": { "base": 0.0, "peak": 0.1, "hz": 8.0 },
  "symmetry": { "type": "radial", "order": 4 },
  "repeat": "forever"
}
```

### 7.7 Validation Rules

- Every required directive must appear exactly once.
- `BASE` and `PEAK` are numeric; a non-numeric is a `FORMULA` bytecode error.
- Unknown directives are warnings, not errors (forward compat).
- `SYMMETRY ORDER` must be a positive integer ≤ 64.
- `DURATION` must be a positive integer ≤ 600000 (10 minutes).

### 7.8 Multi-Block Programs

A blueprint file may contain multiple `ANIM_START … ANIM_END` blocks separated by blank lines. Blocks are independent. A block may reference another block by `id` in `COMPOSITE`.

```text
ANIM_START
ID aura-base
DURATION 1600
EASE TOKEN LINEAR
GLOW BASE 0.2 PEAK 0.4
ANIM_END

ANIM_START
ID aura-pulse
DURATION 800
EASE TOKEN IN_OUT_ARC
GLOW BASE 0.0 PEAK 0.6
COMPOSITE aura-base
ANIM_END
```

---

## 8. The Lattice Coordinate Language

The lattice is the asset. Every visual element is a coordinate, a color, and a part identity.

### 8.1 The Cell

A single cell is:

```ts
interface LatticeCell {
  x: number;          // integer, 0..width-1
  y: number;          // integer, 0..height-1
  z?: number;         // integer depth, default 0
  color: string;      // "#RRGGBB" or "#RRGGBBAA"
  partId: string;     // stable identifier, e.g. "blade", "core"
  effect?: string;    // optional effect class
  emphasis?: number;  // 0..1, used by symmetry analysis
  snappedX?: number;  // nearest grid cell after symmetry transform
  snappedY?: number;
}
```

### 8.2 The Canvas

```ts
interface LatticeCanvas {
  width: number;      // integer
  height: number;
  gridSize: number;   // pixel scale, usually 1
  goldenPoint: { x: number; y: number };  // derived focal point
}
```

### 8.3 The Coordinate Set

A set of cells is:

```ts
type LatticeCoordinateSet = LatticeCell[];
```

The set is **deduplicated by `(x, y, z, partId)`**. Two cells at the same position with the same part id merge by color (last-write-wins) and emphasis (max).

### 8.4 The Lattice Is Sovereign

The lattice is canonical. PNG, SVG, canvas, and shader output are derived. A revert to the lattice restores the asset byte-for-byte. A revert to a PNG does not.

### 8.5 Snapping

`snappedX` and `snappedY` are the nearest integer grid positions after a symmetry transform. The runtime may use snapped coordinates for AA and Phaser placement; the canonical values are still the original integer `(x, y)`.

### 8.6 The Coordinate Invariants

- `x, y` are non-negative integers.
- `x < canvas.width`, `y < canvas.height`.
- `color` matches the regex `^#([0-9A-F]{6}|[0-9A-F]{8})$`.
- `partId` is a non-empty ASCII slug.
- `emphasis` ∈ `[0, 1]`.
- A strict-mirrored part has its cells mirrored on every declared axis; otherwise the run is FATAL.

---

## 9. The VerseIR Substrate

`VerseIR` is the linguistic analogue of the lattice. Where the lattice carries pixels, VerseIR carries the canonical representation of a verse (a scroll, a chant, a poem).

### 9.1 The Substrate

```ts
interface VerseIR {
  version: string;                        // "v1.x"
  rawText: string;
  normalizedText: string;
  lines: VerseLineIR[];
  tokens: VerseTokenIR[];
  surfaceSpans: VerseSurfaceSpanIR[];
  syllableWindows: SyllableWindowIR[];
  indexes: VerseIRIndexes;
  featureTables: VerseIRFeatureTables;
  semanticDepth?: number;
  archetypeResonance?: VerseIRAmplifierArchetype[];
  elementMatches?: VerseIRAmplifierPayload["elementMatches"];
  trueVision?: VerseIRTrueVisionPayload | null;
  verseIRAmplifier?: VerseIRAmplifierPayload | null;
  metadata: { /* compiler, mode, normalization, offsets */ };
}
```

### 9.2 The Line

```ts
interface VerseLineIR {
  lineIndex: number;
  text: string;
  normalizedText: string;
  tokenIds: number[];
  charStart: number;
  charEnd: number;
  graphemeStart: number;
  graphemeEnd: number;
  lineBreak: string;          // "\n", "\r\n", "\r", "mixed", "none"
  lineBreakStart: number;
  lineBreakEnd: number;
  rawSlice: string;
  isTerminalLine: boolean;
}
```

### 9.3 The Token

```ts
interface VerseTokenIR {
  id: number;
  text: string;
  normalized: string;
  normalizedUpper: string;
  lineIndex: number;
  tokenIndexInLine: number;
  globalTokenIndex: number;
  charStart: number;
  charEnd: number;
  graphemeStart: number;
  graphemeEnd: number;
  syllableCount: number;
  phonemes: string[];
  stressPattern: string;     // e.g. "01" for unstressed-stressed
  onset: string[];
  nucleus: string[];
  coda: string[];
  vowelFamily: string[];
  primaryStressedVowelFamily: string | null;
  terminalVowelFamily: string | null;
  rhymeTailSignature: string;
  consonantSkeleton: string;
  extendedRhymeKeys: string[];
  flags: {
    isLineStart: boolean;
    isLineEnd: boolean;
    isStopWordLike: boolean;
    unknownPhonetics: boolean;
  };
  phoneticDiagnostics?: PhoneticDiagnosticTrail | null;
  visualBytecode?: VerseTokenVisualBytecode | null;
  trueVisionBytecode?: VerseIRTrueVisionTokenBytecode | null;
}
```

### 9.4 The Syllable Window

```ts
interface SyllableWindowIR {
  id: number;
  tokenSpan: [number, number];
  lineSpan: [number, number];
  charStart: number;
  charEnd: number;
  graphemeStart: number;
  graphemeEnd: number;
  syllableLength: number;
  phonemeSpan: string[];
  vowelSequence: string[];
  stressContour: string;
  codaContour: string;
  signature: string;        // canonical window hash
}
```

### 9.5 The Indexes

`VerseIR.indexes` is a set of pre-computed reverse lookups:

| Index | Shape | Use |
|---|---|---|
| `tokenIdsByLineIndex` | `Map<lineIndex, tokenId[]>` | Line iteration |
| `lineEndTokenIds` | `tokenId[]` | Rhyme key extraction |
| `tokenIdsByRhymeTail` | `Map<rhymeTail, tokenId[]>` | Rhyme lookup |
| `tokenIdsByVowelFamily` | `Map<vowel, tokenId[]>` | Vowel scan |
| `tokenIdsByTerminalVowelFamily` | `Map<vowel, tokenId[]>` | End-rhyme vowel |
| `tokenIdsByStressedVowelFamily` | `Map<vowel, tokenId[]>` | Stress scan |
| `tokenIdsByConsonantSkeleton` | `Map<skeleton, tokenId[]>` | Onset scan |
| `tokenIdsByStressContour` | `Map<contour, tokenId[]>` | Meter scan |
| `windowIdsBySyllableLength` | `Map<length, windowId[]>` | Window scan |
| `windowIdsBySignature` | `Map<signature, windowId[]>` | Repeated-window scan |

### 9.6 Surface Spans (grapheme-aware offsets)

```ts
interface VerseSurfaceSpanIR {
  id: number;
  lineIndex: number;
  surfaceIndexInLine: number;
  kind: "word" | "whitespace" | "punctuation";
  text: string;
  tokenId: number | null;
  charStart: number;        // code-unit offset
  charEnd: number;
  graphemeStart: number;    // grapheme cluster offset
  graphemeEnd: number;
}
```

The dual offset pair lets UI surfaces do exact hover/selection while code-unit-only consumers stay fast.

### 9.7 The VerseIR Invariants

- `lines[].tokenIds` is dense and contains no gaps.
- `tokens[].id` is unique and monotonic.
- `surfaceSpans[].tokenId` either points to a real token or is `null` (for whitespace/punctuation).
- `featureTables.summary.tokenCount === tokens.length`.
- The compiler descriptor is mandatory and identifies the mode (`live_fast`, `balanced`, `deep_truesight`).

---

## 10. Type Discipline and Strictness Levels

The language has three levels of strictness.

### 10.1 Strict (Default)

A field is required. A missing field is a `VALUE-MISSING_REQUIRED` error. A wrong-typed field is a `TYPE-TYPE_MISMATCH` error. A out-of-range value is a `RANGE-OUT_OF_BOUNDS` error.

This is the default for all `PB-ERR-v1` categories, all packet contracts, and all blueprint directives.

### 10.2 Permissive (Marked)

A field is optional. If the field is missing, the runtime substitutes the documented default. If the field is present but wrong-typed, the strict rule applies.

This is used for fields like `effect`, `emphasis`, `delays`, and many UI-side props.

### 10.3 Loud (Fatal-by-Design)

A field is required *and* the engine refuses to start without it. The run emits a `FATAL` bytecode error and a stack trace.

This applies to:

- Required parts in an `ITEM-SPEC-v1` (`required` list).
- Strict-mirrored parts in a shape-grammar expansion.
- Geometry mask presence in a shader packet.
- Required construction skeleton elements in a foundry run.

---

## 11. The Three Laws of PixelBrain Animation

These three laws are what separate a PixelBrain animation from a per-frame simulation. Every motion in the engine obeys them. Every animation in the engine is a lookup, not a simulation.

### 11.1 Law 1 — Absolute Time Is Sovereign

All rotation and animation use **absolute time** (`time` parameter, in milliseconds), never delta.

```js
const rotation = radiansPerSecond * timeSeconds;
sprite.setRotation(rotation);
```

Why: `rotation = speed × time` is linear, continuous, frame-rate independent. Delta-based animation accumulates error, chokes on frame drops, and breaks determinism.

### 11.2 Law 2 — Bytecode Channels Drive All Motion

Every motion value is a **bytecode lookup**, not a simulation.

```js
const glow = getBytecodeAMP(time, GLOW);
const flicker = getBytecodeAMP(time, FLICKER);
```

Channels: `ROTATION`, `GLOW`, `FLICKER`, `SCALE`, `OPACITY`. Each is an O(1) table read; the table is pre-computed by the AMP at compile time.

### 11.3 Law 3 — Pre-Generate, Never Compute Per-Frame

Patterns (lightning, particles, waves) are **pre-generated and cached**. Runtime selects from cached patterns based on bytecode state.

```js
const pattern = patternCache.get(bytecodeState);
graphics.draw(pattern);
```

The cost of pattern generation is paid once. The cost of selection is O(1).

### 11.4 What These Laws Forbid

- Per-frame `Math.random()`.
- Per-frame `solveLaplace()`, `growLightning()`, or any PDE solver.
- Per-frame `Date.now()` reads.
- Frame-rate-dependent loops with `delta` accumulation.
- GPU-only effects as the only source of canonical geometry.

### 11.5 Performance Budget

| Operation | Budget | Actual |
|---|---|---|
| Bytecode lookup | < 0.01 ms | O(1) table read |
| Rotation calculation | < 0.01 ms | Single multiply |
| Sprite transform | < 0.1 ms | GPU batched |
| Graphics draw | < 1 ms | Vector paths |
| **Total per frame** | **< 16 ms (60 fps)** | Typically 2-4 ms |

---

## 12. The Canonical Rotation Formula

The one formula every PixelBrain author memorizes:

```js
function getRotationAtTime(absoluteTimeMs, bpm, degreesPerBeat = 90) {
  const radiansPerSecond = (degreesPerBeat * Math.PI / 180) * (bpm / 60);
  const timeSeconds = absoluteTimeMs * 0.001;
  const rotation = radiansPerSecond * timeSeconds;
  return rotation % (2 * Math.PI);  // Normalize to [0, 2π)
}
```

**Why it works:**

- `rotation = speed × time` — linear, continuous, no accumulation.
- No `delta` parameter — frame drops don't cause jumps.
- Modulo wrap — never overflows, always smooth.

**Worked example:** at 120 BPM, 90°/beat:

- `radiansPerSecond = (90 × π/180) × (120/60) = π × 2 ≈ 6.283 rad/s`
- `timeSeconds = 0.5`
- `rotation = 6.283 × 0.5 = 3.142 ≈ π`
- `rotation % 2π = π` (half a turn at half a second — correct)

---

## 13. Parsing and Tokenization

A correct parser for any bytecode family has five phases.

### 13.1 Phase 1 — Surface Validation

```js
function isBytecodeString(s) {
  return typeof s === 'string' && s.length > 0 && /^[A-Z][A-Z0-9-]+$/i.test(s);
}
```

### 13.2 Phase 2 — Field Splitting

```js
function splitBytecode(s) {
  const parts = s.split('-');
  // Reconstruct base64 (which may contain '-' in URL-safe form)
  return {
    marker: parts[0],
    family: parts[1],
    version: parts[2],
    body: parts.slice(3, -2),   // everything between version and checksum, except context
    contextB64: parts.slice(3, -1).join('-'),
    checksum: parts[parts.length - 1]
  };
}
```

> The exact slicing depends on the family. For `PB-ERR-v1` (8 fields), `body` is `parts[3..5]`. For `PB-XP-v1` (6 fields), `body` is `parts[3..4]`. Always validate field count against the family grammar.

### 13.3 Phase 3 — Family-Specific Routing

```js
const parsers = {
  'PB-ERR-v1': parseError,
  'PB-FIX-v1': parseFix,
  'PB-RECURSE-v1': parseRecurse,
  'PB-XP-v1': parseXP,
  'PB-DIAG-v1': parseDiag,
  'PB-PRED-v1': parsePred,
  'BIT-EQ-v1': parseEq,
  '0xF': parseFormula,
  'PB-SHADER-v1': parseShader,
  'PB-CONSTRUCTION-SKELETON-v1': parseSkeleton,
  'PB-SHAPE-GRAMMAR-v1': parseShapeGrammar
};
```

### 13.4 Phase 4 — Context Decode

```js
function parseError(s) {
  const parts = splitBytecode(s);
  const ctx = decodeContext(parts.contextB64);
  return {
    marker: parts.marker,         // "PB"
    family: parts.family,         // "ERR"
    version: parts.version,       // "v1"
    category: parts.body[0],
    severity: parts.body[1],
    module: parts.body[2],
    code: parts.body[3],
    context: ctx,
    checksum: parts.checksum
  };
}
```

### 13.5 Phase 5 — Integrity Check

```js
function verify(s) {
  const parsed = parseError(s);
  const partial = `PB-ERR-v1-${parsed.category}-${parsed.severity}-${parsed.module}-${parsed.code}-${parts.contextB64}`;
  const expected = fnv1a8Hex(partial);
  return parsed.checksum.toUpperCase() === expected;
}
```

### 13.6 Error Handling

Every phase that fails must emit a *bytecode* error, not throw a native error. A parser that throws `TypeError` is itself violating the language.

```js
function safeParse(s) {
  try {
    return parseError(s);
  } catch (e) {
    throw new BytecodeError(
      'STATE', 'CRIT', 'SHARED', '0x0301',
      { currentState: 'parsing', expectedState: 'parsed', operation: 'safeParse', cause: e.message }
    );
  }
}
```

---

## 14. Generation Patterns (Emitters)

When you emit a bytecode string, you must do so in canonical order. Below are the canonical emitters for each family.

### 14.1 Emitting an Error

```js
function emitError({ category, severity, module, code, context }) {
  const canonicalContext = canonicalize(context);
  const contextB64 = Buffer.from(canonicalContext, 'utf8').toString('base64');
  const partial = `PB-ERR-v1-${category}-${severity}-${module}-${code}-${contextB64}`;
  const checksum = fnv1a8Hex(partial);
  return `${partial}-${checksum}`;
}
```

### 14.2 Emitting a Fix

```js
function emitFix({ category, op, code, context }) {
  const contextB64 = Buffer.from(canonicalize(context), 'utf8').toString('base64');
  const partial = `PB-FIX-v1-${category}-${op}-${code}-${contextB64}`;
  return `${partial}-${fnv1a8Hex(partial)}`;
}
```

### 14.3 Emitting a Recurse

```js
function emitRecurse({ entrypoint, depth, stack }) {
  const stackHash = fnv1a8Hex(stack.join('|'));
  const partial = `PB-RECURSE-v1-${entrypoint}-${String(depth).padStart(5, '0')}-${stackHash}`;
  return `${partial}-${fnv1a8Hex(partial)}`;
}
```

### 14.4 Emitting an XP Vaccine

```js
function emitXP({ sourceKind, slug, fingerprint }) {
  const partial = `PB-XP-v1-${sourceKind}-${slug}-${fingerprint}`;
  return `${partial}-${fnv1a8Hex(partial)}`;
}
```

### 14.5 Emitting a Diag Report

```js
function emitDiag({ timestamp, context }) {
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  const contextB64 = Buffer.from(canonicalize(context), 'utf8').toString('base64');
  const partial = `PB-DIAG-v1-${timestamp}-${rand}-${contextB64}`;
  return `${partial}-${fnv1a8Hex(partial)}`;
}
```

### 14.6 Emitting an EQ Preset

```js
function emitEqPreset(preset) {
  // Preset is the canonical ScholoCandyEqPreset
  const crc = crc32Hex(canonicalize({
    bands: preset.bands,
    output_gain_db: preset.output_gain_db,
    oversample: preset.oversample,
    analyzer: preset.analyzer
  }));
  return `BIT-EQ-v1-${crc.toUpperCase().padStart(8, '0')}`;
}
```

### 14.7 Emitting a Formula

```js
function emitFormula({ kind, body }) {
  return `0xF:${kind}:${body}`;
}
```

### 14.8 Emitting a Blueprint Block

```js
function emitBlueprint(block) {
  const lines = ['ANIM_START'];
  for (const directive of block.directives) {
    lines.push(formatDirective(directive));
  }
  lines.push('ANIM_END');
  return lines.join('\n');
}

function formatDirective(d) {
  switch (d.kind) {
    case 'ID': return `ID ${d.value}`;
    case 'TARGET': return `TARGET id ${d.value}`;
    case 'DURATION': return `DURATION ${d.value}`;
    case 'EASE': return `EASE TOKEN ${d.value}`;
    case 'SCALE': return `SCALE BASE ${d.base} PEAK ${d.peak}`;
    case 'GLOW': return `GLOW BASE ${d.base} PEAK ${d.peak}`;
    case 'FLICKER': return `FLICKER BASE ${d.base} PEAK ${d.peak} HZ ${d.hz}`;
    case 'ROTATION': return `ROTATION BPS ${d.bpm} DEG ${d.deg}`;
    case 'SYMMETRY': return `SYMMETRY TYPE ${d.type} ORDER ${d.order}`;
    case 'REPEAT': return `REPEAT ${d.value}`;
    default: throw new BytecodeError('VALUE', 'CRIT', 'SHARED', '0x0101', { providedValue: d.kind, allowedValues: ['ID','TARGET'] });
  }
}
```

### 14.9 Emitting a PixelBrain Asset Packet

```js
function emitAssetPacket(packet) {
  return {
    schema: 'pixelbrain.render.v1',
    schemaVersion: '1.0.0',
    sourceBytecode: packet.sourceBytecode,
    material: packet.material,
    coordinates: packet.coordinates,
    palettes: packet.palettes,
    manifest: packet.canvas,
    diagnostics: packet.diagnostics || []
  };
}
```

---

## 15. Verification Patterns (Assertions)

The QA harness at `tests/qa/tools/bytecode-assertions.js` exposes the canonical assertion primitives. They are themselves bytecode-shaped.

### 15.1 `assertEqual(actual, expected, ctx)`

Emits `PB-ERR-v1-VALUE-CRIT-SHARED-0101` on failure. Context includes the actual and expected values.

### 15.2 `assertTrue(condition, ctx)`

Emits `PB-ERR-v1-VALUE-CRIT-SHARED-0103` on failure (treats false as missing-required).

### 15.3 `assertInRange(value, min, max, ctx)`

Emits `PB-ERR-v1-RANGE-CRIT-SHARED-0201` (out of bounds) or `0202` (exceeds max) or `0203` (below min) on failure.

### 15.4 `assertType(value, expectedType, ctx)`

Emits `PB-ERR-v1-TYPE-CRIT-SHARED-0001` on failure.

### 15.5 `assertThrowsBytecode(fn, expectedError, ctx)`

Runs `fn` and asserts the *bytecode* matches the expected error's family, category, severity, module, and code. The message text is *not* asserted (it can vary across implementations); the bytecode is.

### 15.6 The Round-Trip Rule

Every emit/parse pair must be a round-trip: `parse(emit(x)) === x`. The QA suite includes a property test for every emitter:

```js
describe('PB-ERR-v1 round-trip', () => {
  for (const category of Object.keys(CATEGORY_CONTEXT_SCHEMAS)) {
    it(`emits and parses ${category}`, () => {
      const sample = fixtureFor(category);
      const emitted = emitError(sample);
      const parsed = parseError(emitted);
      expect(parsed).toEqual(sample);
      expect(verifyChecksum(emitted)).toBe(true);
    });
  }
});
```

### 15.7 The Recovery Hint Rule

Every error must produce a *recovery hint* that is the inversion of the violation:

| Error | Hint |
|---|---|
| `RANGE-OUT_OF_BOUNDS` | Clamp: `Math.max(min, Math.min(max, value))` |
| `TYPE-TYPE_MISMATCH` | Coerce: `Number(x)`, `String(x)`, or `validate(x)` |
| `STATE-INVALID_STATE` | Transition: `validTransitions[currentState]` |
| `COORD-OUT_OF_BOUNDS` | Recenter: `x = (x % width + width) % width` |
| `COLOR-INVALID_HEX` | Normalize: `x.match(/^#?([0-9a-f]{6})$/i)?.[1]` |

The hint is data, not a code comment; it is part of the `recoveryHints` field on the decoded error.

---

## 16. Interoperability and Family Relationships

The families are not islands. They form a graph.

```
PB-ERR-v1 ──cured by──> PB-FIX-v1
    │                       │
    │                       └──stored as──> PB-XP-v1
    │                                          │
    │                                          └──wrapped in──> SCHOL-BYTXP-MEM-v1
    │
    └──matches──> PB-RECURSE-v1 (for cyclic failures)
                   │
                   └──wrapped in──> SCHOL-BYTXP-MEM-v1 (as health/cure pair)

PB-DIAG-v1 (whole-scan reports) ──stored in──> SCHOL-BYTXP-MEM-v1
PB-PRED-v1 (future)              ──wraps──> RitualPredictionArtifact

0xF Formulas ──compiled by──> PixelBrain Blueprint
                              │
                              └──referenced by──> PB-SHADER-v1
                                                    │
                                                    └──applied by──> pixelbrain.render.v1
                                                                              │
                                                                              └──exported as──> pixelbrain.export.v1

PB-CONSTRUCTION-SKELETON-v1 ──used by──> ITEM-SPEC-v1 (foundry)
PB-SHAPE-GRAMMAR-v1         ──used by──> ITEM-SPEC-v1 (foundry)

BIT-EQ-v1 ──carried by──> scholomance/eq-preset (v2)
```

### 16.1 The XP Loop

1. Engine emits `PB-ERR-v1`.
2. Fix is applied; `PB-FIX-v1` is emitted.
3. The pair is wrapped into a `PB-XP-v1` vaccine.
4. The vaccine is stored as a `SCHOL-BYTXP-MEM-v1` memory envelope.
5. The antigen is now active. Future regressions with the same fingerprint match the cure; the agent receives a `QbitPulseNodeArtifact` pulse and may apply the cure.

### 16.2 The Foundry Loop

1. Author writes `ITEM-SPEC-v1` JSON.
2. Foundry applies the construction skeleton (`PB-CONSTRUCTION-SKELETON-v1`).
3. Foundry applies the shape grammar (`PB-SHAPE-GRAMMAR-v1`).
4. Geometry AMP computes part bounds and roles.
5. Region fill AMP applies material/color authority.
6. Shader packet (`PB-SHADER-v1`) is attached.
7. The result is wrapped in `pixelbrain.render.v1` and `pixelbrain.export.v1`.

---

## 17. Anti-Patterns — What the Language Forbids

| Anti-pattern | Why forbidden | Correct alternative |
|---|---|---|
| `Math.random()` in canonical paths | Breaks determinism | FNV-1a-hashed noise, seed-derived formulas |
| Timestamp-seeded variation | Non-reproducible | Absolute-time lookups |
| Hardcoded z-indexes > 1 in UI | Violates Vaelrix Law 10 | `Z_BASE`, `Z_ABOVE`, `Z_OVERLAY`, `Z_SYSTEM` |
| `throw new Error("...")` | Lossy, unparsable | Throw a `BytecodeError` |
| `console.warn` for required fields | Quiet failure | `FATAL` bytecode error |
| PNG as canonical state | Not a source of truth | Lattice coordinates, then PNG on demand |
| Edits to `SCHEMA_CONTRACT.md` by non-Codex agents | Schema is sovereign | File an `ESCALATION` |
| Inventing a new bytecode family ad hoc | Schema is sovereign | Request a `SCHEMA CHANGE NOTICE` |
| Storing a partial bytecode (truncated) | Breaks checksum | Always store the full string |
| Logging only the prefix of a bytecode | Loses checksum, breaks verification | Log the whole string |
| `eval()` / `new Function()` | Code-injection risk | Compile to bytecode at build time |
| Auto-saving user drafts to the server | Sovereign Editor principle | Browser-only state |
| Telemetry that captures scroll content | Sovereign Editor principle | No content telemetry, ever |
| Per-frame physics simulation | Breeds error, breaks determinism | Pre-generated patterns, bytecode lookups |
| Delta-based rotation | Frame-drop artifact | Absolute-time rotation |
| Hand-edited bytecode checksum | Lies about integrity | Regenerate from the source |

---

## 18. Worked Examples

The following are complete, end-to-end examples that show the language in action.

### 18.1 Hello Bytecode

**Goal:** Emit a `TYPE_MISMATCH` error.

```js
import { emitError, parseError, verifyChecksum } from 'codex/core/pixelbrain/bytecode-error.js';

const bytecode = emitError({
  category: 'TYPE',
  severity: 'CRIT',
  module: 'IMGPIX',
  code: '0001',
  context: { parameterName: 'pixelData', expectedType: 'string', actualType: 'number' }
});

console.log(bytecode);
// PB-ERR-v1-TYPE-CRIT-IMGPIX-0001-eyJwYXJhbWV0ZXJOYW1lIjoicGl4ZWxEYXRhIiwiZXhwZWN0ZWRUeXBlIjoic3RyaW5nIiwiYWN0dWFsVHlwZSI6Im51bWJlciJ9-3E9895BB

const parsed = parseError(bytecode);
console.log(parsed.context);
// { parameterName: 'pixelData', expectedType: 'string', actualType: 'number' }

console.log(verifyChecksum(bytecode));
// true
```

### 18.2 Animate the Orb

**Goal:** Define an orb transmission pulse with radial 4-way symmetry.

```text
ANIM_START
ID orb-transmission-pulse
TARGET id player-orb
DURATION 800
EASE TOKEN IN_OUT_ARC
SCALE BASE 1.0 PEAK 1.05
GLOW BASE 0.0 PEAK 0.5
SYMMETRY TYPE radial ORDER 4
REPEAT forever
ANIM_END
```

This compiles to a `TruesightCompilerDescriptor`-shaped IR and is evaluated at runtime as:

```js
function update(time) {
  const t = (time % 800) / 800;          // 0..1 looped
  const ease = Math.sin(Math.PI * t - Math.PI / 2) * 0.5 + 0.5;
  const scale = 1.0 + (1.05 - 1.0) * ease;
  const glow = 0.0 + (0.5 - 0.0) * ease;
  sprite.setScale(scale);
  graphics.lineStyle(color, glow);
}
```

### 18.3 Forge a Chestplate

**Goal:** Forge a void-willed chestplate with strict mirror trim.

```json
{
  "contract": "ITEM-SPEC-v1",
  "id": "void.chestplate.sovereign.v1",
  "class": "armor",
  "archetype": "chestplate",
  "canvas": { "width": 64, "height": 80, "gridSize": 1 },
  "seed": 110731,
  "bytecode": "VW-VOID-WILL-SONIC-TRANSCENDENT",
  "parts": [
    {
      "id": "body",
      "profile": "armor.chestplate.void_royal_human",
      "fill": { "material": "voidsteel", "intensity": "dark" },
      "trim": { "material": "void_gold", "anchor": "body", "mirror": "STRICT" }
    }
  ],
  "required": ["body", "trim"],
  "strict": ["trim.mirror"]
}
```

If the foundry emits a one-sided trim, it dies with:

```text
PB-ERR-v1-LATTICE-FATAL-CHESTPLATE-0F01-{...strict_mirror_violation...}-CHECKSUM
```

### 18.4 Save an EQ Preset

**Goal:** Save an "Icy Fire" preset for the ScholoCandy DSP.

```json
{
  "version": 2,
  "schema_id": "scholomance/eq-preset",
  "name": "Icy Fire",
  "school": "SONIC",
  "output_gain_db": -3.0,
  "bands": [
    { "id": "band_ABCDEFGH", "type": "bell", "frequency": 1000, "gain": 2.5, "Q": 1.0, "channel": "stereo", "oversample": "2x", "bypass": false }
  ],
  "oversample": "2x",
  "analyzer": { "enabled": true, "peak_hold_ms": 1500 },
  "bytecode": "BIT-EQ-v1-2D61560F",
  "checksum": "<sha256-of-canonical-form>"
}
```

The Rust backend recomputes the `bytecode` from the bands and the `checksum` from the canonical JSON. If the user edits the JSON in the browser, the next save regenerates both.

### 18.5 Record an XP Vaccine

**Goal:** After fixing a recurring `TYPE_MISMATCH`, record the cure as a vaccine.

```js
import { emitXP, wrapAsMemoryEnvelope } from 'codex/core/pixelbrain/xp.js';

const vaccine = emitXP({
  sourceKind: 'error',
  slug: 'type-mismatch-pixeldata',
  fingerprint: 'AB12CD34EF567890'
});

const envelope = wrapAsMemoryEnvelope({
  vaccine,
  vaccineId: 'type-mismatch-pixeldata-v1',
  sourceBytecode: 'PB-ERR-v1-TYPE-CRIT-IMGPIX-0001-...',
  recoveryKey: 'clamp-or-validate-type',
  stableContext: { parameterName: 'pixelData', expectedType: 'string' },
  labels: ['linguistic', 'phonemic', 'meter'],
  provenance: { source: 'codex/core/pixelbrain/bytecode-error.js', pdr: 'bytecode_blueprint_bridge_pdr.md', phase: 'POST_FIX', createdBy: 'codex-architect' }
});

await memory.set(envelope.memoryKey, envelope);
```

A future regression with the same fingerprint lights up the antigen; the agent pulls the envelope and applies the cure.

### 18.6 Compile a Blueprint to a Formula

**Goal:** Turn an `ANIM_START` block into an `0xF:trig` formula.

```text
ANIM_START
ID pulse
DURATION 800
EASE TOKEN IN_OUT_ARC
GLOW BASE 0.0 PEAK 0.5
ANIM_END
```

compiles to:

```text
0xF:trig:g(t)=sin(2*pi*(t%800)/800)*0.5+0.0
```

which compiles to:

```js
const glow = 0.5 * (Math.sin(2 * Math.PI * (timeMs % 800) / 800) * 0.5 + 0.5);
```

### 18.7 Detect a Recursion

**Goal:** Stamp a recursion record when a hook exceeds depth 32.

```js
import { emitRecurse } from 'codex/core/pixelbrain/recursion.js';

function guardedHook(stack) {
  if (stack.length > 32) {
    const bytecode = emitRecurse({
      entrypoint: 'guardedHook',
      depth: stack.length,
      stack: stack
    });
    throw new BytecodeError('STATE', 'FATAL', 'HOOK', '0x0403', {
      hookType: 'guardedHook',
      bytecode,
      reason: 'max depth exceeded'
    });
  }
  // ... rest of the hook
}
```

The bytecode is submitted to the immune system and the agent gains a new antigen.

---

## 19. EBNF Reference Grammar

The full grammar of the language in one place. Use this as a reference for parsers and emitters.

```ebnf
(* Top-level dispatch *)
bytecode          = error_bc | fix_bc | recurse_bc | xp_bc | diag_bc | pred_bc
                  | eq_bc | formula_bc | shader_bc | skeleton_bc | shape_grammar_bc
                  | packet_id
                  | memory_envelope_id
                  | item_spec_id
                  | schema_id
                  | blueprint_block ;

(* Core syntax *)
marker            = "PB" | "BIT" | "SCHOL" | "PIXELBRAIN" ;
version           = "v" DIGIT+ ;
severity          = "FATAL" | "CRIT" | "WARN" | "INFO" ;
module_id         = UPPER ( UPPER | DIGIT ){2,5} ;
code              = 4 HEXDIGIT ;
checksum          = 8 HEXDIGIT ;
context_b64       = { base64-char }+ ;

base64-char       = ALPHA | DIGIT | "+" | "/" | "=" | "-" | "_" ;

(* Families *)
error_bc          = "PB-ERR" "-" version "-" category "-" severity "-" module_id "-" code "-" context_b64 "-" checksum ;
fix_bc            = "PB-FIX" "-" version "-" category "-" fix_op "-" code "-" context_b64 "-" checksum ;
recurse_bc        = "PB-RECURSE" "-" version "-" entrypoint "-" depth "-" stack_hash "-" checksum ;
xp_bc             = "PB-XP" "-" version "-" source_kind "-" slug "-" fingerprint "-" checksum ;
diag_bc           = "PB-DIAG" "-" version "-" timestamp "-" rand4 "-" context_b64 "-" checksum ;
pred_bc           = "PB-PRED" "-" version "-" request_hash "-" trace_checksum "-" checksum ;

eq_bc             = "BIT-EQ" "-" version "-" crc32 ;
formula_bc        = "0xF" ":" formula_kind ":" formula_body ;
shader_bc         = "PB-SHADER" "-" version "-" sha256_prefix "-" checksum ;
skeleton_bc       = "PB-CONSTRUCTION-SKELETON" "-" version "-" skeleton_id "-" hash "-" checksum ;
shape_grammar_bc  = "PB-SHAPE-GRAMMAR" "-" version "-" grammar_id "-" expansion_hash "-" checksum ;

(* Category & module vocabulary *)
category          = "TYPE" | "VALUE" | "RANGE" | "STATE" | "HOOK" | "EXT" | "COORD" | "COLOR"
                  | "NOISE" | "RENDER" | "CANVAS" | "FORMULA" | "LINGUISTIC" | "COMBAT"
                  | "UI_STASIS" | "LATTICE" | "SHADER" | "SCHEMA" ;

(* Fix op vocabulary *)
fix_op            = "validate_type" | "clamp" | "default_value" | "coerce" | "register"
                  | "unregister" | "await" | "normalize" | "assert_invariant" | "switch_state"
                  | "fallback" | "retry" | "noop" | "rebuild_artefact" | "reseed" ;

(* Sub-grammar *)
source_kind       = "error" | "health" | "cccb" ;
entrypoint        = ( ALPHA | DIGIT | "_" | "." ){3,64} ;
depth             = 1*5 DIGIT ;
stack_hash        = 8 HEXDIGIT ;
slug              = ( LOWER | DIGIT | "-" ){3,64} ;
fingerprint       = 16 HEXDIGIT ;
timestamp         = 1*15 DIGIT ;
rand4             = 4 HEXDIGIT ;
request_hash      = 16 HEXDIGIT ;
trace_checksum    = 16 HEXDIGIT ;
crc32             = 8 HEXDIGIT ;
sha256_prefix     = 8 HEXDIGIT ;
hash              = 8 HEXDIGIT ;
expansion_hash    = 16 HEXDIGIT ;
formula_kind      = "1d" | "2d" | "noise" | "sdf" | "trig" | "composite" | "morph" | "fill" ;
formula_body      = { ? any printable ASCII except ':' and LF ? } ;
skeleton_id       = ( LOWER | DIGIT | "-" ){3,64} ;
grammar_id        = ( LOWER | DIGIT | "." | "-" ){3,96} ;

(* Packet carriers *)
packet_id         = "pixelbrain" "." ( "render" | "export" | "shader" | "construction"
                                       | "shape-grammar" | "asset" ) "." version ;
memory_envelope_id = "SCHOL-BYTXP-MEM" "-" version ;
item_spec_id      = { "ITEM-SPEC" "-" version } ;
schema_id         = "scholomance" "/" ( "eq-preset" | "eq-preset" "/" version ) ;

(* Blueprint DSL *)
blueprint_block   = "ANIM_START" NL directive+ "ANIM_END" ;
directive         = id_directive | target_directive | duration_directive | ease_directive
                  | scale_directive | glow_directive | flicker_directive | opacity_directive
                  | rotation_directive | symmetry_directive | repeat_directive | delay_directive
                  | composite_directive ;
id_directive      = "ID" SP slug NL ;
target_directive  = "TARGET" SP "id" SP part_id NL ;
duration_directive= "DURATION" SP positive_integer NL ;
ease_directive    = "EASE" SP "TOKEN" SP ease_token NL ;
scale_directive   = "SCALE" SP "BASE" SP float SP "PEAK" SP float NL ;
glow_directive    = "GLOW" SP "BASE" SP float SP "PEAK" SP float NL ;
flicker_directive = "FLICKER" SP "BASE" SP float SP "PEAK" SP float SP "HZ" SP float NL ;
opacity_directive = "OPACITY" SP "BASE" SP float SP "PEAK" SP float NL ;
rotation_directive= "ROTATION" SP "BPS" SP positive_integer SP "DEG" SP float NL ;
symmetry_directive= "SYMMETRY" SP "TYPE" SP symmetry_type SP "ORDER" SP positive_integer NL ;
repeat_directive  = "REPEAT" SP ( positive_integer | "forever" ) NL ;
delay_directive   = "DELAY" SP positive_integer NL ;
composite_directive = "COMPOSITE" SP slug NL ;
ease_token        = "LINEAR" | "IN_OUT_ARC" | "IN_QUAD" | "OUT_QUAD" | "IN_OUT_QUAD"
                  | "IN_CUBIC" | "OUT_CUBIC" | "IN_OUT_CUBIC" | "SNAP"
                  | ( "STEP_" positive_integer ) ;
symmetry_type     = "none" | "horizontal" | "vertical" | "diagonal" | "radial" ;

(* Lexical primitives *)
positive_integer  = 1* DIGIT ;
float             = [-] DIGIT* "." DIGIT+ | DIGIT+ ;
part_id           = ( ALPHA | DIGIT | "_" | "-" )+ ;
NL                = "\n" | "\r\n" ;
SP                = " " | "\t" ;
HEXDIGIT          = "0".."9" | "A".."F" | "a".."f" ;
ALPHA             = "A".."Z" | "a".."z" ;
DIGIT             = "0".."9" ;
LOWER             = "a".."z" ;
UPPER             = "A".."Z" ;
```

---

## 20. Glossary

The canonical vocabulary of the PixelBrain language. Use this as a lookup table.

### A

**Absolute Time** — The `time` parameter in milliseconds used by all rotation/animation lookups. Frame-rate independent.

**Alliteration** — A `0xF:1d` formula applied to onsets. The first `0xF:1d` formula in a blueprint should describe the alliterative envelope.

**AMP** — Animation MicroProcessor. The runtime that pre-computes bytecode channels and serves them as O(1) lookups.

**Antigen** — A recognized code pattern with a known cure. A `PB-XP-v1` is the canonical antigen.

**ARPAbet** — The phonetic alphabet used to encode vowels and consonants. The five vowel families (`A`, `E`, `I`, `O`, `U`) map to Scholomance's five schools.

**Asset Packet** — A JSON document conforming to `pixelbrain.render.v1` or `pixelbrain.export.v1`. The canonical state of a PixelBrain asset.

**Aseprite Bridge** — The module that round-trips `.aseprite` files into and out of asset packets.

**AXIS** — A symmetry type in `SYMMETRY TYPE …`. `horizontal`, `vertical`, or `diagonal`.

### B

**Base64** — The encoding used for context payloads. Standard base64 by default; URL-safe base64 when embedded in URLs/paths.

**Battle Log** — The turn-by-turn combat event log. Decorations of `CombatResult`.

**Blueprint** — A line-oriented DSL for animation intent. Bounded by `ANIM_START … ANIM_END`.

**Blueprint Block** — A single `ANIM_START … ANIM_END` region. A file may contain many.

**Bytecode** — Any structured string in the PixelBrain language.

**Bytecode Look-up** — The act of reading a pre-computed animation value. Forbidden: any per-frame simulation that produces this value.

### C

**Canonical Form** — The unique byte representation of a JSON object produced by sorting keys and recursively canonicalizing. Required before base64 encoding.

**Canvas** — The integer grid on which a lattice lives. `{ width, height, gridSize, goldenPoint }`.

**Cell** — A single point on a lattice. `{ x, y, z?, color, partId, effect?, emphasis? }`.

**Checksum** — An 8-hex-digit FNV-1a hash that anchors the integrity of a bytecode string. The last field before any trailing whitespace.

**Cleric-Raid** — The immune-system substrate that stores `PB-XP-v1` antigens and their cures.

**Color Byte** — A 24-bit RGB or 32-bit RGBA color encoded as `#RRGGBB[AA]`.

**Combat Result** — The authoritative resolution of a combat action. Decoration: `COMBAT_PREVIEW`. Truth: `COMBAT_RESOLVED`.

**Compile-Ready** — A blueprint is compile-ready when every required directive is present and the syntax is valid.

**Composite Op** — A `COMPOSITE` directive that blends an envelope with another by `id`.

**Context Payload** — The base64-encoded JSON object embedded in a bytecode string. Carries per-instance data.

**Construction Skeleton** — A `PB-CONSTRUCTION-SKELETON-v1` envelope carrying guides, rings, radials, axes, and anchors.

**Coordinate** — An integer pair `(x, y)` (and optional `z`) on a lattice. The first-class visual primitive.

**CRC32** — A 32-bit cyclic redundancy check. Used in `BIT-EQ-v1` because the EQ bitmap is short and benefits from hardware acceleration.

### D

**Determinism** — The axiom that the same input produces the same output. Forbidden: `Math.random`, timestamp variation, unordered iteration.

**Diagnostic** — A `{ start, end, severity, message, source?, metadata? }` record attached to a score trace or panel payload.

**Diag Report** — A `PB-DIAG-v1` encoded diagnostic scan result.

**Dotted Namespace** — The `pixelbrain.render.v1` style of schema identifier. Dots separate the family, kind, and version.

**Drop-In** — A schema that is a strict superset of an existing one and is accepted by readers expecting the older schema.

### E

**Easing Token** — A reserved word that names a transition curve (`LINEAR`, `IN_OUT_ARC`, `IN_QUAD`, …).

**EBNF** — Extended Backus-Naur Form. The notation used in §19.

**Element Match** — A `VerseIRAmplifierMatch` — a detected element (e.g., `EXOTIC_WORD`) with hits, score, coverage, and tokens.

**Emission** — The act of producing a bytecode string. Must be reproducible byte-for-byte from the input object.

**Encyclopedia Search Code** — A `SCHOL-ENC-BYKE-SEARCH-…` identifier attached to a documentation artifact for retrieval.

**EQ Preset** — A `scholomance/eq-preset` v2 JSON. Carried by `BIT-EQ-v1` in its `bytecode` field.

**Error Code** — A 4-hex-digit code under a category (e.g., `0001` is `TYPE_MISMATCH` under `TYPE`).

**Etymology** — The lexical history of a word, optional in `LexicalEntry`.

**Event Bus** — The runtime string-event bus. `emit(eventName, payload)` / `on(eventName, cb)`.

**Expansion Hash** — The `PB-SHAPE-GRAMMAR-v1` `EXPANSION_HASH` field. The sha256 of the canonical expansion.

**Export Packet** — A `pixelbrain.export.v1` JSON. An immutable snapshot of an asset at a boundary.

### F

**Fatal** — A severity that ends the process. Used for required-but-missing or required-but-broken.

**Field** — A position in a bytecode string, separated by `-`.

**Filter Type** — The kind of filter in an EQ preset band: `bell`, `lowShelf`, `highShelf`, `lowPass`, `highPass`, `notch`, `bandPass`, `allPass`, `tilt`.

**Fix Vocabulary** — The list of canonical `OP` values in `PB-FIX-v1` (`validate_type`, `clamp`, …).

**FNV-1a** — The hash function used for all checksums in the language. 32-bit, non-cryptographic, deterministic, fast.

**Formula** — A `0xF:*` mathematical expression. The canonical description of a pixel-art transform.

**Foundry** — The `item-foundry.js` module. The producer of `PixelBrainAssetPacket` from an `ITEM-SPEC-v1`.

**Frame Rate Independence** — The property that animation behaviour does not depend on the host's frame rate. Achieved by absolute time.

**Frost Class** — A pedagogical class for cold/icy materials. Not a language concept; mentioned for context.

### G

**Glow** — A `GLOW` directive in a blueprint. Drawn via `graphics.lineStyle(color, glow)`.

**Glossary** — This section.

**Glyph** — A reusable visual primitive on a lattice. Identified by `partId`.

**Grammar** — The set of rules that determine whether a string is a valid member of the language. See §19.

**Grapheme** — A user-perceived character. May be multiple code units (e.g., combining accents, emoji ZWJ sequences). The VerseIR substrate tracks both code-unit and grapheme offsets.

### H

**Hash** — Any deterministic fixed-size fingerprint of a string. The language uses FNV-1a for checksums and SHA-256 for high-fidelity fingerprints.

**Healing** — A field on `CombatScoreResponse` indicating the supportive component of a combat result. May accompany damage.

**Heuristic** — A scoring function. Carried by `ScoreTrace` with `rawScore`, `weight`, `contribution`, and `explanation`.

**Hex Digits** — `0-9A-Fa-f`. Checksums are uppercase; context may be either.

**Hook** — A callback registered in the extension registry. Subject to `HOOK-*` errors.

### I

**ID Directive** — The `ID <slug>` blueprint directive. Required.

**Immune System** — The substrate that stores and matches antigens against future regressions.

**Item Spec** — A `ITEM-SPEC-v1` JSON. The source input to the foundry.

**Inter-Cell** — The relationship between two cells. Defined by position (`x`, `y`, `z`), color, and part id.

**Invariance** — A property that holds in all valid states. Often recorded as a recovery hint in a bytecode error.

### J

**JIT** — Just-in-time compilation. Not used in the language; all compilation happens at build time or in user-authored blueprint blocks.

**Jitter** — A small, deterministic perturbation. Computed from coordinates, not from a random source.

### K

**Keyword** — A reserved word in the language (`ANIM_START`, `ANIM_END`, `LINEAR`, `IN_OUT_ARC`, …).

### L

**Language** — The PixelBrain language. The set of all valid bytecodes, blueprints, packets, lattice states, and VerseIR shapes.

**Lattice** — The integer-cell grid. The asset.

**Lattice Cell** — A single point on a lattice. The basic visual primitive.

**Lexical Entry** — A `LexicalEntry` JSON describing a word (definitions, synonyms, rhymes, etc.).

**Lexicon Abyss** — The Scholomance word database (WordNet + GCIDE + Datamuse).

**Line** — A `VerseLineIR`. A line in a verse.

**Line Break Style** — The line-break discipline: `lf`, `crlf`, `cr`, `mixed`, `none`. The compiler records it in the IR metadata.

**Line End Token** — The terminal token of a line. The source of the line's rhyme key.

**Loud Failure** — The axiom that required-but-missing must be `FATAL`, not `WARN`.

### M

**Manifest** — The `{ width, height, gridSize, goldenPoint }` block that describes a lattice canvas.

**Marker** — The leading token of a bytecode string (`PB`, `BIT`, `SCHOL`, `PIXELBRAIN`).

**Mastering** — A high-fidelity render of an asset. Always derived from a packet, never canonical.

**Material** — A `RegionFillAMP` concept. The color authority for a region (`voidsteel`, `icy_fire`, …).

**Memory Envelope** — A `SCHOL-BYTXP-MEM-v1` JSON. The storable form of a `PB-XP-v1`.

**Memory Key** — The namespaced key under which a memory envelope is stored. `scholomance:bytecode-xp:{vaccineId}`.

**Mirror** — A symmetry type. `STRICT` mirrors are loud-failure.

**Module ID** — A 3-6 char code identifying the source module of a bytecode error.

**Motif** — A heraldry or engraving. Subject to `STRICT` mirror rules.

### N

**Narrative AMP** — A `NarrativeAMPPayload` describing the verse as a story beat. The Scholomance-native narrative relay.

**Noise** — A `0xF:noise` formula. Deterministic, seed-derived.

**Noise Floor** — A field in `VerseIRTrueVisionPayload` describing ambient signal.

**Non-Goal** — An explicit out-of-scope item in a PDR or white paper. Lists what the language does NOT do.

**Normalize** — To bring an input into the language's canonical form. Two equivalent objects must produce the same bytecode.

**Nucleus** — The vowel of a syllable. One of the five vowel families in Scholomance.

### O

**Opcode** — A reserved word in a directive (`BASE`, `PEAK`, `HZ`, `BPS`, `DEG`, `TYPE`, `ORDER`).

**Onset** — The consonant cluster at the start of a syllable. Drives alliteration scoring.

**Opacity** — A `OPACITY` directive. Drawn via sprite alpha.

**Opponent Spell** — An `OpponentSpell` describing an enemy cast in combat.

**Oracle** — A `OraclePayload` providing coaching commentary and suggestions for a verse.

**Oversample** — A field on EQ preset bands: `1x`, `2x`, `4x`, `8x`, `auto`.

### P

**Packet** — A JSON document conforming to a dotted-namespace schema (`pixelbrain.render.v1`, `pixelbrain.export.v1`).

**Palette** — A named list of colors. Anchors material transmutation.

**Part ID** — A stable string identifier for a visual part. The unit of strict-mirror rules.

**PBMAP** — PixelBrain Map. A short name for a `PixelBrainAssetPacket` in some UI surfaces.

**PDR** — Product Design Requirement. The `docs/scholomance-encyclopedia/PDR-archive/` collection. Source of human-authored design intent.

**Phaser Renderer** — The execution layer. Consumes bytecode and draws pixels.

**Phoneme** — A unit of sound. Stored as ARPAbet codes in `VerseTokenIR.phonemes`.

**Phonetic Diagnostic** — A `PhoneticDiagnosticTrail` describing how a phoneme was derived (source, branch, fallback, authority, notes).

**Pixel Brain** — (proper noun) The Scholomance visual synthesis engine. Synonym: PixelBrain.

**PixelBrain Coordinate** — A `PixelBrainCoordinate` from a `PixelBrainPayload`. The lattice-level view of a verse token.

**PixelBrain Palette** — A `PixelBrainPalette` from a `PixelBrainPayload`. Carries `bytecode`, `colors`, `byteMap`.

**PixelBrain Payload** — A `PixelBrainPayload` carrying the lattice projection of a verse: canvas, palettes, coordinates, dominant axis/symmetry.

**Predictor** — The `usePredictor` hook. AI-driven heuristic engine for input anticipation and sequence completion.

**Preview** — A non-authoritative render. Decoration only.

**Pulse** — A `QbitPulseNodeArtifact`. The radial collapse-confident signal from a probe.

### Q

**QBIT** — Quantum-Bytecode Infusion Tag. The runtime probe substrate.

**Qbit Pulse Node** — A `QbitPulseNodeArtifact`. The antigen's probe.

**Qbit Probe Enrichment** — A `QbitProbeEnrichmentArtifact`. The probe's metadata envelope.

**Quality Gate** — A CI-enforced check (`npm run lint`, `npm run typecheck`, `npm run verify:css-tokens`, `npm run test:qa`, `npm run test:visual`).

**Query Pattern** — A `RhymeAstrologyQueryPattern`. The input to a rhyme-astrology query.

### R

**Radial** — A symmetry type with `ORDER` rotations.

**Range** — A category of bytecode error: out-of-bounds, exceeds max, below min.

**Recurse** — A `PB-RECURSE-v1` record marking an observed recursion.

**Region Fill AMP** — The `region-fill-amp.js` module. The material/color authority.

**Registry** — A name → value map (extensions, renderers, materials, palettes, hooks).

**Render Packet** — A `pixelbrain.render.v1` JSON. May apply material transmutation.

**Repair** — A `PB-FIX-v1`. The cure for a `PB-ERR-v1`.

**Required Field** — A field that must be present in a valid payload. Missing required → `VALUE-MISSING_REQUIRED`.

**Reserved Family** — A family whose grammar is published but whose use is restricted (`PB-PRED-v1`).

**Resolution** — The act of turning bytecode into runtime state (e.g., a rotation, a glow).

**Rhyme Astrology** — The Scholomance discipline of mapping a verse's rhyme to a constellation. The `RhymeAstrologyResult` and friends.

**Rhyme Key** — A canonical fingerprint of a rhyme. The terminal `rhymeTailSignature` of a line.

**Rhyme Tail Signature** — The canonical phonetic signature of a terminal word. The atomic rhyme key.

**Rotation** — A `ROTATION` directive in a blueprint. Drawn via `sprite.setRotation`.

**Runtime Bus** — The string-event bus. The current sanctioned transport for cross-layer messages.

**Runtime Event** — A named event on the bus. `runtime:word_lookup_result`, etc.

### S

**Schema** — A type definition in `SCHEMA_CONTRACT.md`. Sovereign.

**Schema Change Notice** — A `SCHEMA CHANGE NOTICE` block at the top of `SCHEMA_CONTRACT.md` declaring a change.

**Schema ID** — A slash-namespaced identifier (`scholomance/eq-preset`).

**Score Trace** — A `ScoreTrace` record explaining a heuristic's contribution to a final score.

**Scoring** — The act of turning a verse into a number. The `combat.scoring.js` module.

**SDF** — Signed Distance Field. A `0xF:sdf` formula.

**Seam Contract** — A required-output declaration. The contract between shape grammar and route.

**Seed** — An integer used as a derivation source for deterministic noise and procedural generation. Required in `ITEM-SPEC-v1`.

**Severity** — `FATAL`, `CRIT`, `WARN`, `INFO`. Determines reaction.

**Shape Grammar** — A `PB-SHAPE-GRAMMAR-v1` rule expansion.

**Slug** — A stable, kebab-case identifier. Used in blueprint IDs and XP slugs.

**Snapping** — The act of rounding a coordinate to the nearest integer grid cell.

**Sovereign** — Of a schema, code, or value: the canonical source. `SCHEMA_CONTRACT.md` is sovereign. The lattice is sovereign.

**Strict** — A strictness level. Required and validated loudly.

**Strict Mirror** — A mirror rule that emits a `FATAL` error if violated.

**String Event** — A name on the runtime bus. `runtime:word_lookup_result`.

**Surface Span** — A `VerseSurfaceSpanIR`. A word, whitespace, or punctuation in the surface form of a verse.

**Symbolic Calculus** — Arbitrary user-supplied math. Forbidden in canonical paths.

**Symmetry** — The structural identity of an asset under a transform. `none`, `horizontal`, `vertical`, `diagonal`, `radial`.

**Syllable Window** — A `SyllableWindowIR`. A window of consecutive syllables.

### T

**TAG** — A reserved prefix that names a category or sub-language. `PB`, `BIT`, `SCHOL`, `PIXELBRAIN`.

**Tag (combat)** — A combat intent or cadence tag (`COMMAND`, `RESOLVED`, …).

**Target** — A `TARGET id <part-id>` directive. The lattice part driven by the animation.

**Token** — A `VerseTokenIR`. A word in the verse.

**Token Graph** — A graph of `TokenGraphNode`s and `TokenGraphEdge`s used for prediction.

**Token ID** — A unique integer identifier for a token in a `VerseIR`.

**Trace** — A `ScoreTrace`. The explanation of a scoring contribution.

**Truesight** — The Scholomance mode that overlays phonetic color on a verse. Driven by `WordAnalysis` records.

**Tunable** — A parameter that can be modified at runtime without recompiling. Band gain, Q, etc.

### U

**UI Stasis** — The category of error for UI hangs, RAF orphans, listener leaks. `UI_STASIS`.

**Unified Linguistic Artifact** — The output of `useVerseSynthesis`. A bundle of rhyme, meter, phonemes, etc.

**Underscore** — Reserved for use *inside* fields, not as a separator.

**Uniform** — A value passed to a shader. `time`, `bpm`, `signalLevel`, …

**Untrusted** — A bytecode with a missing or invalid checksum. Refused by readers.

**URI** — Universal Resource Identifier. `collab://agents`, `pbrain://...`.

**UPPERCASE** — The casing convention for enum and fixed-token fields.

### V

**Vaccine** — A `PB-XP-v1` artifact. The cure for a `PB-ERR-v1`.

**Validation** — The act of asserting a payload matches its schema.

**Version** — The `v1`, `v2`, etc., segment of a bytecode family. Required.

**Verse IR** — The `VerseIR` substrate. The linguistic IR.

**Visual Bytecode** — A `VerseTokenVisualBytecode` carrying per-token visual metadata.

**Vowel Family** — A canonical vowel group (`A`, `E`, `I`, `O`, `U`, plus Scholomance's `AE`, `AW`, `AY`, `EH`, `ER`, `EY`, `IH`, `IY`, `OH`, `OW`, `OY`, `UH`, `UW`).

### W

**Whisper** — A `WARN` or `INFO` error. Forbidden for required-field violations.

**Word Analysis** — A `WordAnalysis` record. The Truesight overlay input.

**Worked Example** — A complete, end-to-end example. See §18.

### X

**XOR** — A bitwise exclusive-or. Used in some `0xF:composite` formulas.

**XP** — eXPerience. The `PB-XP-v1` family.

### Z

**Z-Index** — The vertical stacking order of UI elements. Hardcoded z-indexes > 1 are forbidden (Vaelrix Law 10). Use `Z_BASE`, `Z_ABOVE`, `Z_OVERLAY`, `Z_SYSTEM`.

**Zero-Padding** — The discipline of left-padding numeric fields to a fixed width (`0001`, `00042`, `0xABCD1234`).

**Z-Order** — Synonym for z-index in Phaser contexts. Subject to the same law.

---

## 21. Constant Reference

A flat index of every named constant in the language.

### 21.1 Severities

| Constant | Value | Meaning |
|---|---|---|
| `FATAL` | 4-char string | Process cannot continue |
| `CRIT` | 4-char string | Subsystem cannot continue |
| `WARN` | 4-char string | Degraded; tolerable |
| `INFO` | 4-char string | Diagnostic |

### 21.2 Categories

| Constant | Value | Code range |
|---|---|---|
| `TYPE` | enum | `0x0000`-`0x00FF` |
| `VALUE` | enum | `0x0100`-`0x01FF` |
| `RANGE` | enum | `0x0200`-`0x02FF` |
| `STATE` | enum | `0x0300`-`0x03FF` |
| `HOOK` | enum | `0x0400`-`0x04FF` |
| `EXT` | enum | `0x0500`-`0x05FF` |
| `COORD` | enum | `0x0600`-`0x06FF` |
| `COLOR` | enum | `0x0700`-`0x07FF` |
| `NOISE` | enum | `0x0800`-`0x08FF` |
| `RENDER` | enum | `0x0900`-`0x09FF` |
| `CANVAS` | enum | `0x0A00`-`0x0AFF` |
| `FORMULA` | enum | `0x0B00`-`0x0BFF` |
| `LINGUISTIC` | enum | `0x0C00`-`0x0CFF` |
| `COMBAT` | enum | `0x0D00`-`0x0DFF` |
| `UI_STASIS` | enum | `0x0E00`-`0x0EFF` |
| `LATTICE` | enum | `0x0F00`-`0x0FFF` |
| `SHADER` | enum | `0x1000`-`0x10FF` |
| `SCHEMA` | enum | `0x1100`-`0x11FF` |

### 21.3 Module IDs (canonical)

| Constant | Owner |
|---|---|
| `IMGPIX` | PixelBrain image pixel engine |
| `IMGFOR` | PixelBrain formula engine |
| `COORD` | PixelBrain coordinate mapper |
| `COLBYT` | PixelBrain color bytecode |
| `NOISE` | PixelBrain noise engine |
| `LINGUA` | Linguistic analyzer |
| `COMBAT` | Combat resolver |
| `UISTAS` | UI stasis guard |
| `EXTREG` | Extension registry |
| `SHARED` | Shared test harness |
| `EQPRE` | EQ preset codec |
| `LATTICE` | Lattice grid engine |
| `SHADER` | Shader packet engine |
| `SCHEMA` | Schema contract guard |
| `GEARGL` | Gear glide AMP |
| `CHESTPLATE` | Chestplate AMP route |
| `PREDICTOR` | Ritual prediction engine |
| `BLUEPRINT` | Blueprint bridge compiler |
| `FOUNDRY` | Item foundry |

### 21.4 Schools (vowel mapping)

| School | Vowel family | Hue |
|---|---|---|
| `SONIC` | A, AE, AW, AY | Purple |
| `PSYCHIC` | E, EH, ER, EY | Cyan |
| `VOID` | I, IH, IY | Zinc |
| `ALCHEMY` | O, OH, OW, OY | Magenta |
| `WILL` | U, UH, UW | Orange |

### 21.5 Truesight Modes

| Mode | Use |
|---|---|
| `live_fast` | Editor real-time feedback |
| `balanced` | Default analysis |
| `deep_truesight` | Full compiler with windows and rhyme astrology |

### 21.6 Line Break Styles

| Style | Meaning |
|---|---|
| `lf` | Unix (`\n`) |
| `crlf` | Windows (`\r\n`) |
| `cr` | Classic Mac (`\r`) |
| `mixed` | Multiple styles in one input |
| `none` | No line breaks; treat as one line |

### 21.7 Z-Index Tiers (UI sovereignty)

| Tier | Value | Use |
|---|---|---|
| `Z_BASE` | 0 | Standard page content, static backgrounds |
| `Z_ABOVE` | 10 | Tooltips, small menus |
| `Z_OVERLAY` | 100 | Full-screen overlays, intrusive selection |
| `Z_SYSTEM` | 1000 | Critical system elements (toasts, debug badges) |

### 21.8 Rarities (combat)

| ID | Ordinal | Praise |
|---|---|---|
| `COMMON` | 0 | Mundane |
| `UNCOMMON` | 1 | Noteworthy |
| `GRIMOIRE` | 2 | Spellscribed |
| `MYTHIC` | 3 | Myth-touched |
| `LEGENDARY` | 4 | Saga-grade |
| `SOURCE` | 5 | Origin-touched |

### 21.9 Speech Acts (combat)

`COMMAND`, `INVOCATION`, `THREAT`, `PLEA`, `DECLARATION`, `TAUNT`, `QUESTION`, `BANISHMENT`, `CURSE`, `BLESSING`.

### 21.10 Cadence Tags (combat)

`RESOLVED`, `SUSPENDED`, `CLIPPED`, `FALLING`, `RISING`, `LEVEL`, `SURGING`, `WITHHELD`.

### 21.11 Filter Types (EQ v2)

`bell`, `lowShelf`, `highShelf`, `lowPass`, `highPass`, `notch`, `bandPass`, `allPass`, `tilt`.

### 21.12 Channel Modes (EQ v2)

`left`, `right`, `stereo`, `mid`, `side`.

### 21.13 Oversample Modes (EQ v2)

`1x`, `2x`, `4x`, `8x`, `auto`.

### 21.14 Symmetry Types

`none`, `horizontal`, `vertical`, `diagonal`, `radial`.

### 21.15 Easing Tokens

`LINEAR`, `IN_OUT_ARC`, `IN_QUAD`, `OUT_QUAD`, `IN_OUT_QUAD`, `IN_CUBIC`, `OUT_CUBIC`, `IN_OUT_CUBIC`, `SNAP`, `STEP_<n>`.

### 21.16 Formula Kinds

`1d`, `2d`, `noise`, `sdf`, `trig`, `composite`, `morph`, `fill`.

### 21.17 Source Kinds (XP)

`error`, `health`, `cccb`.

### 21.18 Schema Identifiers

| Schema id | Family | Use |
|---|---|---|
| `pixelbrain.render.v1` | Packet | Render-bound canonical state |
| `pixelbrain.export.v1` | Packet | Export-bound canonical state |
| `scholomance/eq-preset` | Schema id | ScholoCandy EQ preset v1/v2 |
| `ITEM-SPEC-v1` | Item spec | Foundry input |
| `PB-ERR-v1` | Bytecode | Error encoding |
| `PB-FIX-v1` | Bytecode | Fix encoding |
| `PB-RECURSE-v1` | Bytecode | Recursion detection |
| `PB-XP-v1` | Bytecode | Vaccine artifact |
| `PB-PRED-v1` | Bytecode (reserved) | Ritual prediction |
| `PB-DIAG-v1` | Bytecode | Diagnostic report |
| `PB-SHADER-v1` | Bytecode | Shader packet |
| `PB-CONSTRUCTION-SKELETON-v1` | Bytecode | Construction guide |
| `PB-SHAPE-GRAMMAR-v1` | Bytecode | Shape grammar |
| `BIT-EQ-v1` | Bytecode | EQ preset identifier |
| `0xF` | Formula | Pixel-art formula prefix |
| `SCHOL-BYTXP-MEM-v1` | Memory envelope | XP memory artifact |
| `SCHOL-ENC-BYKE-SEARCH-*` | Encyclopedia | Doc search code |

---

## 22. Cross-References and External Reading

### 22.1 Foundational Documents (read first)

- [`SHARED_PREAMBLE.md`](../../Scholomance%20LAW/SHARED_PREAMBLE.md) — the world
- [`VAELRIX_LAW.md`](../../Scholomance%20LAW/VAELRIX_LAW.md) — the law
- [`SCHEMA_CONTRACT.md`](../../Scholomance%20LAW/SCHEMA_CONTRACT.md) — the schemas

### 22.2 Bytecode Error System

- [`docs/ByteCode Error System/01_Bytecode_Error_System_Overview.md`](../ByteCode%20Error%20System/01_Bytecode_Error_System_Overview.md)
- [`docs/ByteCode Error System/02_Error_Code_Reference.md`](../ByteCode%20Error%20System/02_Error_Code_Reference.md)
- [`docs/ByteCode Error System/03_AI_Parsing_Guide.md`](../ByteCode%20Error%20System/03_AI_Parsing_Guide.md)
- [`docs/ByteCode Error System/04_QA_Integration_Guide.md`](../ByteCode%20Error%20System/04_QA_Integration_Guide.md)
- [`docs/ByteCode Error System/05_Integration_Summary.md`](../ByteCode%20Error%20System/05_Integration_Summary.md)

### 22.3 White Papers

- [`PIXELBRAIN_AGENT_OPERATING_MANUAL.md`](./PIXELBRAIN_AGENT_OPERATING_MANUAL.md)
- [`PIXELBRAIN_CONNECTIVE_TISSUE_WHITE_PAPER.md`](./PIXELBRAIN_CONNECTIVE_TISSUE_WHITE_PAPER.md)
- [`SHADER_FORGE_WHITE_PAPER.md`](./SHADER_FORGE_WHITE_PAPER.md)
- [`IMMUNE-SYSTEM-WHITE-PAPER.md`](./IMMUNE-SYSTEM-WHITE-PAPER.md)
- [`CLERICAL_RAID_WHITE_PAPER.md`](./CLERICAL_RAID_WHITE_PAPER.md)
- [`TURBOQUANT_WHITE_PAPER.md`](./TURBOQUANT_WHITE_PAPER.md)
- [`BYTECODE_DIAGNOSTIC_SYNTHESIS_WHITE_PAPER.md`](./BYTECODE_DIAGNOSTIC_SYNTHESIS_WHITE_PAPER.md)
- [`BYTECODE_HEALTH_WHITE_PAPER.md`](./BYTECODE_HEALTH_WHITE_PAPER.md)

### 22.4 PDRs (PixelBrain)

- [`2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-connective-tissue-seven-systems-pdr.md)
- [`2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-render-fidelity-pipeline-pdr.md)
- [`2026-06-11-pixelbrain-emblem-microprocessor-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-emblem-microprocessor-pdr.md)
- [`2026-06-11-pixelbrain-item-foundry-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-item-foundry-pdr.md)
- [`2026-06-11-pixelbrain-square-sharpness-contrast-amp-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-square-sharpness-contrast-amp-pdr.md)
- [`2026-06-11-pixelbrain-color-intensity-rating-microprocessor-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-color-intensity-rating-microprocessor-pdr.md)
- [`2026-06-11-pixelbrain-directional-light-finish-pdr.md`](../PDR-archive/2026-06-11-pixelbrain-directional-light-finish-pdr.md)
- [`2026-06-12-pixelbrain-character-creator-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-character-creator-pdr.md)
- [`2026-06-12-pixelbrain-deterministic-shape-grammar-router-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-deterministic-shape-grammar-router-pdr.md)
- [`2026-06-12-pixelbrain-deterministic-pro-chestplate-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-deterministic-pro-chestplate-pdr.md)
- [`2026-06-12-pixelbrain-editor-aseprite-rival-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-editor-aseprite-rival-pdr.md)
- [`2026-06-12-pixelbrain-holy-fire-paladin-sword-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-holy-fire-paladin-sword-pdr.md)
- [`2026-06-12-pixelbrain-sdf-and-coherent-noise-integration-pdr.md`](../PDR-archive/2026-06-12-pixelbrain-sdf-and-coherent-noise-integration-pdr.md)
- [`2026-06-15-pixelbrain-volume-container-and-blender-bridge-pdr.md`](../PDR-archive/2026-06-15-pixelbrain-volume-container-and-blender-bridge-pdr.md)
- [`2026-06-12-foundry-aseprite-bridge-pdr.md`](../PDR-archive/2026-06-12-foundry-aseprite-bridge-pdr.md)
- [`2026-06-12-jewelry-amp-pdr.md`](../PDR-archive/2026-06-12-jewelry-amp-pdr.md)
- [`2026-06-12-sketchamp-construction-line-microprocessor-pdr.md`](../PDR-archive/2026-06-12-sketchamp-construction-line-microprocessor-pdr.md)
- [`2026-06-11-chromatic-transmutation-amp-pdr.md`](../PDR-archive/2026-06-11-chromatic-transmutation-amp-pdr.md)
- [`2026-06-11-super-depth-analysis-channel-pdr.md`](../PDR-archive/2026-06-11-super-depth-analysis-channel-pdr.md)
- [`2026-06-11-known-color-microprocessors-pdr.md`](../PDR-archive/2026-06-11-known-color-microprocessors-pdr.md)
- [`bytecode_blueprint_bridge_pdr.md`](../PDR-archive/bytecode_blueprint_bridge_pdr.md)
- [`ByteCode_Error_System_V3_pdr.md`](../PDR-archive/ByteCode_Error_System_V3_pdr.md)
- [`ByteCode Diagnostic Synthesis PDR`](../PDR-archive/ByteCode%20Diagnostic%20Synthesis%20PDR%20(1).md)
- [`bytecode_contextual_compression_checksums_pdr.md`](../PDR-archive/bytecode_contextual_compression_checksums_pdr.md)
- [`cell_wall_infrastructure_pdr.md`](../PDR-archive/cell_wall_infrastructure_pdr.md)
- [`adaptive_palette_pdr.md`](../PDR-archive/adaptive_palette_pdr.md)
- [`animation_amp_pdr.md`](../PDR-archive/animation_amp_pdr.md)
- [`ChestplateAMP-pdr.md`](../PDR-archive/ChestplateAMP-pdr.md)
- [`CLERICAL_RAID_PDR.md`](../PDR-archive/CLERICAL_RAID_PDR.md)
- [`cognitive_bus_pdr.md`](../PDR-archive/cognitive_bus_pdr.md)
- [`collab_control_plane_mcp_convergence_pdr.md`](../PDR-archive/collab_control_plane_mcp_convergence_pdr.md)

### 22.5 Core Source Modules (in `codex/core/pixelbrain/`)

| Module | Purpose |
|---|---|
| `bytecode-error.js` | `PB-ERR-v1` encoding/decoding |
| `item-spec.js` | `ITEM-SPEC-v1` normalization |
| `item-foundry.js` | Foundry entry point |
| `pixelbrain-asset-packet.js` | `pixelbrain.render.v1` and `pixelbrain.export.v1` |
| `shader-packet.js` | `PB-SHADER-v1` envelope |
| `construction-line-microprocessor.js` | `PB-CONSTRUCTION-SKELETON-v1` |
| `shape-grammar-engine.js` | `PB-SHAPE-GRAMMAR-v1` |
| `formula-to-coordinates.js` | `0xF` formula → coordinates |
| `image-to-bytecode-formula.js` | image → `0xF` formula |
| `lattice-grid-engine.js` | Lattice coordinates |
| `coordinate-mapping.js` | Transform and snap |
| `symmetry-amp.js` | Symmetry detection |
| `color-byte-mapping.js` | Color bytecode mapping |
| `deterministic-noise.js` | Seed-derived noise |
| `procedural-noise.js` | Pattern generation |
| `raster-math.js` | Pixel arithmetic |
| `sdf-evaluator.js` | SDF evaluation |
| `editor-command-stack.js` | Editor undo/redo |
| `template-grid-engine.js` | Template editor lattice |

### 22.6 QA & Test Anchors

- `tests/qa/tools/bytecode-assertions.js` — canonical assertion library
- `tests/core/pixelbrain/` — focused tests
- `tests/qa/pixelbrain/` — QA pipeline tests
- `tests/qa/generation/` — procedural generation tests
- `tests/pixelbrain/` — broader integration

### 22.7 UI Surfaces (in `src/pages/PixelBrain/`)

- `PixelBrainPage.jsx` — main workspace
- `components/TemplateEditor.jsx` — lattice editing
- `components/ShaderForgePanel.jsx` — shader authoring
- `components/LayerStackPanel.jsx` — layer inspector
- `components/AMPApplyPanel.jsx` — AMP operations

---

## Closing Note

The PixelBrain language is not the destination. It is the bridge — the canonical surface at which human design intent and deterministic machine execution can meet without ambiguity. New families will be added; old families will be versioned; the EBNF in §19 will grow. The axioms will not.

If you are authoring a new family, you are adding a dialect of the language, not a parallel language. Add it to the EBNF, add an entry to the constant reference, add a glossary entry, and file a `SCHEMA CHANGE NOTICE`. The schema is sovereign, but the schema is a living document.

The bytecodes are the truth. The lattice is the asset. The errors are the cure's seed. The blueprint is the human. The runtime is the machine. The language is the contract.

Welcome.

— *End of White Paper*
