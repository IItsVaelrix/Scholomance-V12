import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import { RuleRegistry } from "../../src/core/scd64/RuleRegistry";

function scan(code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  const sf = project.createSourceFile("frag.tsx", code);
  return RuleRegistry.evaluateAll(sf);
}

const isGhost = (m: { family: string }) => m.family === "RESONANCE_GHOST";

describe("RuleRegistry RESONANCE_GHOST precision (assignment-context)", () => {
  it("does NOT flag a destructuring default param `resonantCharStarts = null`", () => {
    // This is the false positive the autonomous scan surfaced in
    // LexicalScrollEditor.jsx:284 — a prop default, not a gate-nulling.
    const code = `
      const Editor = ({ foo, resonantCharStarts = null, bar }, ref) => {
        return null;
      };
    `;
    expect(scan(code).filter(isGhost)).toHaveLength(0);
  });

  it("does NOT flag a multi-line destructuring default ending in `}`", () => {
    const code = `
      const {
        resonantCharStarts = null
      } = props;
    `;
    expect(scan(code).filter(isGhost)).toHaveLength(0);
  });

  it("STILL flags a real gate-nulling reassignment `resonantCharStarts = null;`", () => {
    const code = `
      function build() {
        resonantCharStarts = null;
        return resonantCharStarts;
      }
    `;
    const hits = scan(code).filter(isGhost);
    expect(hits).toHaveLength(1);
    expect(hits[0].ruleId).toBe("SCD64.RESONANCE_GHOST.LEGACY_EVIDENCE");
  });

  it("STILL flags an emptied gate Set `resonantCharStarts = [];`", () => {
    const code = `
      function build() {
        resonantCharStarts = [];
      }
    `;
    expect(scan(code).filter(isGhost)).toHaveLength(1);
  });
});
