import { describe, it, expect } from "vitest";
import { generateSCD64ForFamily } from "../../../codex/core/immunity/spatial-immune-orchestrator.js";
import { generateSCD64 as generateSCD64FromGlossary } from "../../../src/core/scd64/generateSCD64FromSlots";
import { decodeSCD64Hover } from "../../../src/core/scd64/decodeSCD64";

describe("SCD64 SCORE_DRIFT family", () => {
  it("mints a deterministic confirmed checksum with version byte 05", () => {
    const a = generateSCD64ForFamily("SCORE_DRIFT");
    const b = generateSCD64ForFamily("SCORE_DRIFT");

    expect(a.checksum64).toMatch(/^[0-9A-F]{64}$/);
    expect(a.checksum64.slice(0, 2)).toBe("05");
    expect(a.bugFamily).toBe("SCORE_DRIFT");
    expect(a.domain).toBe("SCORING");
    // Deterministic: same canonicals → same hex.
    expect(a.checksum64).toBe(b.checksum64);
  });

  it("decodes the SCORE_DRIFT checksum back to its family via the glossary", () => {
    const { checksum64 } = generateSCD64ForFamily("SCORE_DRIFT");
    const decoded = decodeSCD64Hover(checksum64);

    expect(decoded.valid).toBe(true);
    expect(decoded.versionByte).toBe("05");
    expect(decoded.bugFamily).toBe("SCORE_DRIFT");
    expect(decoded.slots.length).toBe(8);
    expect(decoded.slots[0].meaning).not.toBe("Unknown code");
  });

  it("derives the identical checksum from both family tables (no drift)", () => {
    // glossary.ts BUG_FAMILIES vs orchestrator BUG_FAMILIES must be byte-identical.
    const fromGlossary = generateSCD64FromGlossary("SCORE_DRIFT");
    const fromOrchestrator = generateSCD64ForFamily("SCORE_DRIFT").checksum64;

    expect(fromGlossary).toBe(fromOrchestrator);
  });
});
