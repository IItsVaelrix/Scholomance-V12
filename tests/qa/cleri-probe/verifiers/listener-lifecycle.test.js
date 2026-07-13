import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listenerLifecycleVerifier } from "../../../../codex/core/immunity/cleri-probe/verifiers/listener-lifecycle.verifier.js";
import {
  HOSTILE_SOURCES,
  assertFamilyGate,
  assertStableAndBounded,
  predicateMap,
  verify,
  verifiedLines
} from "./verifier-harness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, "../../fixtures/cleri-probe/listener-lifecycle");
const read = name => fs.readFileSync(path.join(fixtures, name), "utf8");

const COMPONENT = "src/components/RoomPanel.jsx";

const LEAK_SOURCE = `
import { useEffect } from 'react';

export function RoomPanel() {
  useEffect(() => {
    const handler = () => console.log('resized');
    window.addEventListener('resize', handler);
  }, []);
  return null;
}
`;

describe("listener lifecycle verifier", () => {
  it("verifies an effect registration with no returned cleanup", () => {
    const result = verify(listenerLifecycleVerifier, { path: COMPONENT, source: LEAK_SOURCE });

    expect(result.verdict).toBe("VERIFIED");
    expect(verifiedLines(result)).toEqual([7]);

    const predicates = predicateMap(result.findings[0]);
    expect(predicates.EFFECT_CALLBACK_REGISTERS_LISTENER_OR_SUBSCRIPTION).toBe(true);
    expect(predicates.REGISTRATION_IDENTITY_IS_STABLE).toBe(true);
    expect(predicates.MATCHING_REMOVE_IN_RETURNED_CLEANUP).toBe(false);
    expect(predicates.CAPTURED_UNSUBSCRIBE_CALLED_IN_CLEANUP).toBe(false);
    expect(predicates.REGISTRATION_IS_SELF_TERMINATING).toBe(false);
  });

  it("reports the registration span and its receiver and event", () => {
    const finding = verify(listenerLifecycleVerifier, { path: COMPONENT, source: LEAK_SOURCE }).findings[0];
    expect(finding.span.startLine).toBe(7);
    expect(finding.summary).toContain("window");
    expect(finding.summary).toContain("resize");
  });

  describe("counterchecks", () => {
    it("returns NO_FINDING when cleanup removes the same receiver, event, and handler", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel() {
  useEffect(() => {
    const handler = () => console.log('resized');
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return null;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("verifies a cleanup that removes a different handler identity", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel() {
  useEffect(() => {
    const handler = () => console.log('resized');
    const other = () => console.log('other');
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', other);
  }, []);
  return null;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("verifies a cleanup that removes a different event", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel() {
  useEffect(() => {
    const handler = () => console.log('resized');
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return null;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("returns NO_FINDING when a captured unsubscribe is called in cleanup", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel({ store }) {
  useEffect(() => {
    const unsubscribe = store.subscribe(() => console.log('changed'));
    return () => unsubscribe();
  }, [store]);
  return null;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when a captured unsubscribe is returned directly", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel({ store }) {
  useEffect(() => {
    const unsubscribe = store.subscribe(() => console.log('changed'));
    return unsubscribe;
  }, [store]);
  return null;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for a self-terminating once:true listener", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel() {
  useEffect(() => {
    const handler = () => console.log('ready');
    window.addEventListener('load', handler, { once: true });
  }, []);
  return null;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for a once() registration", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel({ socket }) {
  useEffect(() => {
    socket.once('ready', () => console.log('ready'));
  }, [socket]);
  return null;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for an adjacent IMMUNE_ALLOW: listener-lifecycle annotation", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel() {
  useEffect(() => {
    const handler = () => console.log('resized');
    // IMMUNE_ALLOW: listener-lifecycle — lives for the page session, reviewed 2026-07-13
    window.addEventListener('resize', handler);
  }, []);
  return null;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("scope discipline", () => {
    it("does not treat a class lifecycle mount/unmount pair as a finding", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
export class RoomPanel {
  componentDidMount() {
    window.addEventListener('resize', this.handler);
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.handler);
  }
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("does not treat a class mount without unmount as a finding either", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
export class RoomPanel {
  componentDidMount() {
    window.addEventListener('resize', this.handler);
  }
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
      expect(listenerLifecycleVerifier.limitations.join(" ")).toContain("class");
    });

    it("does not accept a removal that lives outside the returned cleanup", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

function detach(handler) {
  window.removeEventListener('resize', handler);
}

export function RoomPanel() {
  useEffect(() => {
    const handler = () => console.log('resized');
    window.addEventListener('resize', handler);
  }, []);
  return null;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
    });

    it("does not conflate registrations in sibling effects", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
import { useEffect } from 'react';

export function RoomPanel({ socket }) {
  useEffect(() => {
    const handler = () => console.log('a');
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    socket.on('room-update', (msg) => console.log(msg));
  }, [socket]);

  return null;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
      expect(verifiedLines(result)).toEqual([12]);
    });

    it("does not verify a registration outside any effect", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: COMPONENT,
        source: `
const handler = () => console.log('resized');
window.addEventListener('resize', handler);
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("corpus fixtures", () => {
    it("verifies the historical equipment-changed leak shape", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: "tests/qa/fixtures/cleri-probe/listener-lifecycle/verified.jsx",
        source: read("verified.jsx")
      });
      expect(result.verdict).toBe("VERIFIED");
      expect(verifiedLines(result)).toEqual([9, 18]);
    });

    it("reports no finding for the fixed form", () => {
      const result = verify(listenerLifecycleVerifier, {
        path: "tests/qa/fixtures/cleri-probe/listener-lifecycle/hard-negative.jsx",
        source: read("hard-negative.jsx")
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("meets its labeled precision gate", () => {
      const score = assertFamilyGate(listenerLifecycleVerifier);
      expect(score.precision).toBe(1);
      expect(score.recall).toBe(1);
    });
  });

  describe("robustness", () => {
    it("survives hostile and unsupported syntax without throwing", () => {
      for (const hostile of HOSTILE_SOURCES) {
        const result = verify(listenerLifecycleVerifier, hostile);
        expect(["VERIFIED", "NO_FINDING"]).toContain(result.verdict);
      }
    });

    it("tolerates a candidate with no facts", () => {
      const result = listenerLifecycleVerifier.verify(
        { path: COMPONENT, span: null, facts: null },
        { pathologyClass: "LEAKED_LISTENER_SUBSCRIPTION" }
      );
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("is byte-identical across 25 repetitions and within its fixture budget", () => {
      assertStableAndBounded(listenerLifecycleVerifier, {
        path: "tests/qa/fixtures/cleri-probe/listener-lifecycle/verified.jsx",
        source: read("verified.jsx")
      });
    });
  });
});
