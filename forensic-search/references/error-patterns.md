# Logic Fracture & Error Patterns

Common signatures for forensic identification of World-Law violations.

## 1. Logic-Fractures
- **Race Condition**: Multiple `useEffect` hooks competing for same state without proper cleanup.
  - *Signature*: Missing `return () => cancelAnimationFrame(id)` or `clearTimeout`.
- **State Drift**: UI state diverging from Bytecode source of truth.
  - *Signature*: Parallel local state variables that should be derived from `analysis` or `bytecode`.
- **Null Cascade**: Single missing guard causing entire render tree to collapse.
  - *Signature*: `Cannot read properties of null (reading 'style')`.

## 2. Math-Rot
- **The Great Silence (NaN)**: Division by zero or unvalidated token lengths.
  - *Signature*: `/ 0`, `/ someVar.length` without zero-guard.
- **Coordinate Drift**: Absolute vs. relative coordinate confusion in PixelBrain/TrueSight.
  - *Signature*: Hardcoded offsets (`+ 8`, `- 4`) not derived from `AdaptiveGridTopology`.

## 3. Bytecode Violations
- **Manual Bytecode Creation**: Agents "faking" bytecode instead of using authoritative amplifiers.
  - *Signature*: Literal strings like `"PB-ERR-v1-..."` in production code instead of `new BytecodeError()`.
- **Inert Resonance**: Resonance flags on stop words.
  - *Signature*: `effectClass: 'RESONANT'` for tokens in `STOP_WORDS` set.

## 4. Layer-Drift
- **Illegal Imports**: Pure logic importing UI components.
  - *Signature*: `import { motion }` or `import React` in `codex/core`.
- **Z-Index Anarchy**: Hardcoded z-index > 1.
  - *Signature*: `z-index: [2-9][0-9]*`.
