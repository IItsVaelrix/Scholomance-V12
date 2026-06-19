/**
 * ForgeGatePanel — PixelBrain Forge Craft Gate (Immunity verdict surface)
 *
 * UI SPEC:
 * - Component: ForgeGatePanel — src/pages/PixelBrain/components/ForgeGatePanel.jsx
 * - World-law connection: The Craft Gate is Immunity made visible. A forged item
 *   asset only enters the world once the gate certifies its lattice as pixel-perfect,
 *   readable, deterministic, and materially authoritative. The verdict is bytecode —
 *   a PB-XP vaccine on PASS, a PB-ERR sigil on a blocking FAIL. This panel renders
 *   that judgement as a glyph pulse, never an alert box.
 * - Silhouette blueprint: a sealed `.silh` is BOTH mould and inspector. Loading one
 *   re-runs the gate against the blueprint's front/side/top shadow masks (and any
 *   animation poses) via runForgeCraftGateWithBlueprint. The verdict surfaces a
 *   per-view PASS/FAIL chip row and, on a blocking FAIL, the offending view/phase.
 * - Data consumed: onRunGate(spec) and onRunBlueprint(spec, silhText) — supplied by
 *   PixelBrainPage, which calls the pixelbrain.adapter. No codex/ or src/lib import here.
 * - State: loaded spec metadata + the last verdict + a "running" pulse, plus the last
 *   parsed spec (held in a ref so a follow-up blueprint run reuses it). Hooks only.
 * - Accessibility: aria-live verdict regions, labelled file controls, status text for SR.
 * - Animation: glyph pulse on verdict; CSS-gated by prefers-reduced-motion.
 */

import { useState, useRef, useCallback } from "react";

const PHASE = { IDLE: "idle", RUNNING: "running", PASS: "pass", FAIL: "fail" };
const VIEWS = ["front", "side", "top"];

/** Resolve a single view's chip state from the blueprint verdict. */
function chipState(view, phase, verdict) {
  if (phase === PHASE.PASS) return "pass";
  if (phase === PHASE.FAIL && verdict?.view === view) return "fail";
  return "idle";
}

export function ForgeGatePanel({ onRunGate, onRunBlueprint }) {
  const [specName, setSpecName] = useState(null);
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [verdict, setVerdict] = useState(null);

  const [blueprintName, setBlueprintName] = useState(null);
  const [blueprintPhase, setBlueprintPhase] = useState(PHASE.IDLE);
  const [blueprintVerdict, setBlueprintVerdict] = useState(null);

  // The last successfully parsed spec — held in a ref so a blueprint loaded in the
  // same tick (no intervening render) still sees it. The .silh is graded against
  // this spec's forge output, so a spec must be loaded first.
  const lastSpecRef = useRef(null);

  const handleFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      // Reset the input so re-picking the same file fires change again.
      e.target.value = "";
      if (!file) return;

      setPhase(PHASE.RUNNING);
      setSpecName(file.name);
      setVerdict(null);

      try {
        const text = await file.text();
        const spec = JSON.parse(text);
        lastSpecRef.current = spec;
        const result = onRunGate ? onRunGate(spec) : { ok: false, reason: "Gate unavailable" };
        if (result.ok) {
          setPhase(PHASE.PASS);
          setVerdict({ bytecode: result.vaccine, reason: null });
        } else {
          setPhase(PHASE.FAIL);
          setVerdict({ bytecode: result.bytecode, reason: result.reason });
        }
      } catch (err) {
        setPhase(PHASE.FAIL);
        setVerdict({ bytecode: null, reason: `Malformed spec — ${err.message}` });
      }
    },
    [onRunGate]
  );

  const handleBlueprintFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;

      setBlueprintName(file.name);
      setBlueprintPhase(PHASE.RUNNING);
      setBlueprintVerdict(null);

      try {
        const silhText = await file.text();
        const spec = lastSpecRef.current;
        if (!spec) {
          setBlueprintPhase(PHASE.FAIL);
          setBlueprintVerdict({
            bytecode: null,
            reason: "Load an item spec before sealing it against a blueprint.",
            view: null,
            phase: null,
          });
          return;
        }
        const result = onRunBlueprint
          ? onRunBlueprint(spec, silhText)
          : { ok: false, reason: "Blueprint gate unavailable" };
        if (result.ok) {
          setBlueprintPhase(PHASE.PASS);
          setBlueprintVerdict({ bytecode: result.vaccine, reason: null, view: null, phase: null });
        } else {
          setBlueprintPhase(PHASE.FAIL);
          setBlueprintVerdict({
            bytecode: result.bytecode,
            reason: result.reason,
            view: result.view ?? null,
            phase: result.phase ?? null,
          });
        }
      } catch (err) {
        setBlueprintPhase(PHASE.FAIL);
        setBlueprintVerdict({
          bytecode: null,
          reason: `Malformed blueprint — ${err.message}`,
          view: null,
          phase: null,
        });
      }
    },
    [onRunBlueprint]
  );

  const statusLine =
    phase === PHASE.PASS
      ? "GATE PASSED — asset is immune"
      : phase === PHASE.FAIL
      ? "GATE BLOCKED — asset rejected"
      : phase === PHASE.RUNNING
      ? "Auditing lattice…"
      : "Load an ITEM-SPEC-v1 to run the gate";

  const blueprintStatusLine =
    blueprintPhase === PHASE.PASS
      ? "BLUEPRINT SEALED — shadows match"
      : blueprintPhase === PHASE.FAIL
      ? "BLUEPRINT BLOCKED — shadow mismatch"
      : blueprintPhase === PHASE.RUNNING
      ? "Projecting shadows…"
      : "Load a sealed .silh to grade the shadows";

  return (
    <div className="pb-forge-gate">
      <p className="pb-forge-gate__hint">
        Audits lattice construction, silhouette readability, determinism, material
        authority &amp; voxel packet. Emits bytecode-grade PASS / FAIL.
      </p>

      <label className="pb-action-btn pb-forge-gate__load" htmlFor="pb-forge-gate-spec">
        Load Item Spec &amp; Run Gate
      </label>
      <input
        id="pb-forge-gate-spec"
        className="pb-forge-gate__input"
        type="file"
        accept=".json,application/json"
        onChange={handleFile}
        aria-label="Load an ITEM-SPEC-v1 JSON and run the forge craft gate"
      />

      <div
        className={`pb-forge-gate__verdict pb-forge-gate__verdict--${phase}`}
        role="status"
        aria-live="polite"
      >
        <span className="pb-forge-gate__glyph" aria-hidden="true">
          {phase === PHASE.PASS ? "✦" : phase === PHASE.FAIL ? "⚠" : "◌"}
        </span>
        <div className="pb-forge-gate__verdict-body">
          <span className="pb-forge-gate__status">{statusLine}</span>
          {specName && (
            <span className="pb-forge-gate__spec-name">{specName}</span>
          )}
          {verdict?.bytecode && (
            <code className="pb-forge-gate__bytecode">{verdict.bytecode}</code>
          )}
          {verdict?.reason && (
            <span className="pb-forge-gate__reason">{verdict.reason}</span>
          )}
        </div>
      </div>

      {/* Silhouette blueprint — sealed .silh moulds + inspects the three shadows */}
      <label className="pb-action-btn pb-forge-gate__load" htmlFor="pb-forge-gate-silh">
        Load Silhouette Blueprint (.silh)
      </label>
      <input
        id="pb-forge-gate-silh"
        className="pb-forge-gate__input"
        type="file"
        accept=".silh,.txt,text/plain"
        onChange={handleBlueprintFile}
        aria-label="Load a silhouette blueprint (.silh) and run the gate"
      />

      {/* aria-live (not role=status) so the page keeps a single status landmark —
          the spec verdict above — while still announcing blueprint verdicts. */}
      <div
        className={`pb-forge-gate__verdict pb-forge-gate__verdict--${blueprintPhase}`}
        aria-live="polite"
        aria-label="Silhouette blueprint verdict"
      >
        <span className="pb-forge-gate__glyph" aria-hidden="true">
          {blueprintPhase === PHASE.PASS ? "✦" : blueprintPhase === PHASE.FAIL ? "⚠" : "◌"}
        </span>
        <div className="pb-forge-gate__verdict-body">
          <span className="pb-forge-gate__status">{blueprintStatusLine}</span>
          {blueprintName && (
            <span className="pb-forge-gate__spec-name">{blueprintName}</span>
          )}

          {blueprintVerdict && (
            <div className="pb-forge-gate__views" role="group" aria-label="Per-view shadow verdict">
              {VIEWS.map((view) => {
                const state = chipState(view, blueprintPhase, blueprintVerdict);
                return (
                  <span
                    key={view}
                    className={`pb-view-chip pb-view-chip--${state}`}
                    data-testid={`pb-view-chip-${view}`}
                    data-state={state}
                  >
                    {view}
                  </span>
                );
              })}
            </div>
          )}

          {blueprintVerdict?.bytecode && (
            <code className="pb-forge-gate__bytecode">{blueprintVerdict.bytecode}</code>
          )}
          {blueprintVerdict?.reason && (
            <span className="pb-forge-gate__reason">{blueprintVerdict.reason}</span>
          )}
          {blueprintVerdict?.phase && (
            <span className="pb-forge-gate__reason">
              offending phase: {blueprintVerdict.phase}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForgeGatePanel;
