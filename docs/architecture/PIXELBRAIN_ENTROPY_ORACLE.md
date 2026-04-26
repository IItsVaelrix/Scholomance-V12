# PixelBrain Entropy Oracle

**Domain:** Quality Assurance, Mathematical Stasis, & Pre-flight Diagnostics
**Status:** Canonical Implementation Target (V12)
**Arbiter:** High Inquisitor (Gemini)

---

## 1. The Purpose of the Oracle

The PixelBrain Entropy Oracle is a deterministic divination engine. Its purpose is to calculate the **Entropy Probability**—the exact mathematical likelihood of a mutation introducing a bug, infinite loop, or logic fracture—before any ink touches the parchment (i.e., before a file is written or replaced).

In the Scholomance, we do not guess if a change is safe. We calculate it. The Oracle parses proposed code changes into an Abstract Syntax Tree (AST), maps the dependency graph, and assigns a Volatility Score. If the score exceeds the Stasis Threshold, the change is rejected, forcing the acting agent to refactor their approach.

---

## 2. The Four Phases of Divination

### Phase One: AST Transmutation (The Skeleton)
The Oracle breaks the proposed `new_string` into a mathematical tree. It does not read text; it reads structure.
- **Unclaimed Variable Detection:** It maps the scope chain. If a variable is invoked but not bound, the mutation is flagged.
- **Syntactic Loop Verification:** It ensures all braces, brackets, and parentheses form perfectly closed loops.
- **Hook Dependency Extraction:** For React surfaces, it extracts dependency arrays (e.g., `[setActiveScrollId, bumpAutosaveContext]`) for later validation.

### Phase Two: The Dependency Matrix (The Blast Radius)
The codebase is mapped as a Directed Acyclic Graph (DAG).
- **Inbound Edges:** How many files depend on the target file? Modifying a core primitive (e.g., `SafeMath`) carries exponentially more risk than modifying a single page.
- **Mathematical Weight:** `Risk Multiplier = 1.0 + (Inbound Edges * 0.05)`

### Phase Three: Volatility Heuristics (The Magic)
Specific code patterns carry inherent entropic weight. The Oracle assigns a base risk score based on the nature of the change:
- **`useEffect` Modification:** +0.30 Risk (High chance of Temporal Freeze / Infinite Loops).
- **Missing `useCallback` on passed functions:** +0.25 Risk (Render thrashing).
- **Mutating Global State (`window`, global refs):** +0.40 Risk (Race conditions).
- **Pure Function implementation:** -0.20 Risk (Stasis-safe; reduces overall volatility).
- **Unbound React Hooks (Missing Dependencies):** +0.50 Risk (State rot).

### Phase Four: The PixelBrain Synthesis
The formula for the final Volatility Score ($V$):
$$V = (Base\_Heuristic\_Sum) \times (Dependency\_Multiplier) \times (Complexity\_Depth\_Factor)$$

- If $V > 0.60$ (60%): The mutation is flagged as **HIGH RISK**. The agent must provide extensive corroborating tests.
- If $V > 0.85$ (85%): The mutation is **REJECTED**. The agent is forbidden from applying the change and must break the logic down into smaller, safer primitives.

---

## 3. The Contract

All agents operating in the Collab Plane must abide by the `PixelBrainEntropyOracle` schema defined in `SCHEMA_CONTRACT.md`. 

When proposing a structural change, the agent invokes the Oracle (either via a dedicated Collab pre-flight script or an MCP tool). The Oracle returns an `EntropyOracleVolatilityReport`. The agent must log this report in their thought-chain or bug report.

```json
{
  "timestamp": 1777053000000,
  "filePath": "src/pages/Read/ReadPage.jsx",
  "volatilityScore": 0.82,
  "thresholdExceeded": true,
  "criticalRisks": [
    "Unbound dependency 'setActiveScrollId' inside 'useEffect'",
    "Mutation occurs in a file with 12 inbound edges"
  ],
  "actionRecommendation": "REJECT"
}
```

By enforcing this mathematical stasis, we ensure the Great Silence (500 errors, NaN loops, and broken pointers) never returns to the Scholomance.
