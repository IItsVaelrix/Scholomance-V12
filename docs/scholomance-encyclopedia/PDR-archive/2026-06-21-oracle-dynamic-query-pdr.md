# PDR: Oracle Dynamic Query Engine

## 1. Meta
- **Date**: 2026-06-21
- **Feature**: Oracle Dynamic Query Engine (NLP + ML)
- **Status**: APPROVED for Implementation
- **Driver**: Antigravity (Codex/Gemini Hybrid Task)

## 2. Objective
Evolve the Lexicon Oracle from a single-word dictionary/rhyme search tool into a dynamic, context-aware writing mentor. By introducing a `QUERY` mode, users can ask natural language questions (up to 200 words) about their verse. The Oracle will respond using NLP and ML algorithms, informed by the current CODEx telemetry (Hidden Harkov Models, Token Weights, and VerseIR) to generate fully dynamic speech patterns and highly personalized recommendations.

## 3. Architecture & Implementation Plan

### Phase A: Frontend (UI & Hook)
1. **`src/hooks/useOracleQuery.jsx`**
   - Clone the architectural resilience of `useWordLookup.jsx`.
   - **Contract**: This hook MUST NEVER THROW. It must map network or ML failures into structured Oracle error states `{ data, status, error: { category, code, severity, message } }`.
   - **Input**: Accepts a `query` string and `deepAnalysis` (the VerseSynthesis artifact).
   - **Validation**: Enforce a strict <= 200-word limit locally to prevent payload bloat.

2. **`src/pages/Read/SearchPanel.jsx`**
   - Introduce a new state: `const [mode, setMode] = useState('WORD'); // 'WORD' | 'CORPUS' | 'QUERY'`.
   - Update `OracleTerminalChrome` to accept multi-word input gracefully when in `QUERY` mode.
   - When in `QUERY` mode, bypass `useWordLookup` and instead consume `useOracleQuery`.
   - Ensure `OracleSignalFallback` handles `QUERY` mode failures gracefully (e.g., "The Oracle's foresight is clouded...").

### Phase B: Backend (API & ML Bridge)
1. **`codex/server/routes/oracle.routes.js`**
   - Expose `POST /api/oracle/query`.
   - **Payload**: `{ query: string, telemetry: { hhm, tokenWeights, verseIR, emotion } }`.
   - **Validation**: Reject queries > 200 words at the edge.

2. **`codex/server/services/oracleDialogue.service.js`**
   - The ML integration layer.
   - Takes the raw user query and the CODEx telemetry, formatting them into a structured System Prompt for the LLM (Gemini API / Vertex).
   - Instructs the ML layer to adopt dynamic speech patterns based on the text's emotion and HHM (e.g., sharp and staccato if the verse is heavy, or flowing if melancholic).
   - Returns the generated dialogue string.

## 4. Compliance & Scholomance Law
- **Pillar 4 (Oracle UI Fail-Safe)**: ML generation is inherently volatile (latency spikes, API outages). The system must rely on `OracleSignalFallback` if the ML fails, ensuring the editor remains in absolute stasis without crashing.
- **Data Boundary**: The query engine is strictly localized to the current scroll/verse. It must not cross-pollinate with global user data beyond the current verse context.
- **UX Constraint**: 200-word limit ensures the Oracle remains an analytical tool, not a generic chatbot.

## 5. Next Steps
1. Author `src/hooks/useOracleQuery.jsx`.
2. Add `QUERY` mode toggle and integration into `src/pages/Read/SearchPanel.jsx`.
3. Create the `POST /api/oracle/query` backend infrastructure.
