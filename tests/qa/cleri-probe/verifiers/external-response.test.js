import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { externalResponseVerifier } from "../../../../codex/core/immunity/cleri-probe/verifiers/external-response.verifier.js";
import {
  HOSTILE_SOURCES,
  assertFamilyGate,
  assertStableAndBounded,
  predicateMap,
  verify,
  verifiedLines
} from "./verifier-harness.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.resolve(__dirname, "../../fixtures/cleri-probe/external-response");
const read = name => fs.readFileSync(path.join(fixtures, name), "utf8");

const MODULE = "src/services/profile.js";

describe("external response verifier", () => {
  it("verifies fetch response.json() dereferenced without a status guard", () => {
    const result = verify(externalResponseVerifier, {
      path: MODULE,
      source: `
async function fetchUserProfile(userId) {
  const response = await fetch('/api/user/' + userId);
  const data = await response.json();
  return data.profile.name;
}
`
    });

    expect(result.verdict).toBe("VERIFIED");
    expect(verifiedLines(result)).toEqual([5]);

    const predicates = predicateMap(result.findings[0]);
    expect(predicates.BINDING_ORIGINATES_FROM_APPROVED_EXTERNAL_CLIENT).toBe(true);
    expect(predicates.EXTERNAL_PAYLOAD_IS_DEREFERENCED).toBe(true);
    expect(predicates.HTTP_STATUS_GUARDED).toBe(false);
    expect(predicates.PAYLOAD_SCHEMA_PARSED).toBe(false);
    expect(predicates.APPROVED_NORMALIZATION_ADAPTER_CALLED).toBe(false);
  });

  it("verifies axios data access without a guard", () => {
    const result = verify(externalResponseVerifier, {
      path: MODULE,
      source: `
import axios from 'axios';

async function loadConfig() {
  const res = await axios.get('/api/config');
  return res.data.settings.theme;
}
`
    });
    expect(result.verdict).toBe("VERIFIED");
    expect(verifiedLines(result)).toEqual([6]);
  });

  it("verifies an alias of the payload inside the same function", () => {
    const result = verify(externalResponseVerifier, {
      path: MODULE,
      source: `
import axios from 'axios';

async function loadConfig() {
  const res = await axios.get('/api/config');
  const payload = res.data;
  return payload.settings.theme;
}
`
    });
    expect(result.verdict).toBe("VERIFIED");
  });

  describe("counterchecks", () => {
    it("returns NO_FINDING when the HTTP status is guarded", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
async function fetchUserProfile(userId) {
  const response = await fetch('/api/user/' + userId);
  if (!response.ok) return null;
  const data = await response.json();
  return data.profile.name;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when the payload is schema-parsed", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
import { ProfileSchema } from './schema';

async function fetchUserProfile(userId) {
  const response = await fetch('/api/user/' + userId);
  const data = await response.json();
  const profile = ProfileSchema.parse(data);
  return profile.name;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when the payload is safeParsed", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
async function fetchUserProfile(userId) {
  const response = await fetch('/api/user/' + userId);
  const data = await response.json();
  const parsed = schema.safeParse(data);
  return data.profile.name;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when an approved normalization adapter is called", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
import { normalizeProfile } from './adapters';

async function fetchUserProfile(userId) {
  const response = await fetch('/api/user/' + userId);
  const data = await response.json();
  const profile = normalizeProfile(data);
  return profile.name;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING when the payload access is optional-chained", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
import axios from 'axios';

async function loadConfig() {
  const res = await axios.get('/api/config');
  return res.data?.settings?.theme ?? 'default';
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("returns NO_FINDING for an adjacent IMMUNE_ALLOW: external-response annotation", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
async function fetchUserProfile(userId) {
  const response = await fetch('/api/user/' + userId);
  const data = await response.json();
  // IMMUNE_ALLOW: external-response — internal service, contract-tested
  return data.profile.name;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });
  });

  describe("dataflow discipline", () => {
    it("does not verify a local object merely named response", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
function renderProfile() {
  const response = { profile: { name: 'Vaelrix' } };
  return response.profile.name;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("does not follow a binding across function boundaries", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
async function load() {
  const response = await fetch('/api/user');
  return response;
}

function render(data) {
  return data.profile.name;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("does not confuse a shadowed response binding in a sibling function", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
function renderCached() {
  const response = { profile: { name: 'cached' } };
  return response.profile.name;
}

async function fetchUserProfile() {
  const response = await fetch('/api/user');
  const data = await response.json();
  return data.profile.name;
}
`
      });
      expect(result.verdict).toBe("VERIFIED");
      expect(verifiedLines(result)).toEqual([10]);
    });

    it("does not treat a status property read as a payload dereference", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
async function ping() {
  const response = await fetch('/api/health');
  return response.ok;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("reports an unsupported client as a limitation, not a finding", () => {
      const result = verify(externalResponseVerifier, {
        path: MODULE,
        source: `
function legacyLoad() {
  const request = new XMLHttpRequest();
  request.open('GET', '/api/config');
  return request.responseText.length;
}
`
      });
      expect(result.verdict).toBe("NO_FINDING");
      expect(externalResponseVerifier.limitations.join(" ")).toContain("fetch");
    });
  });

  describe("corpus fixtures", () => {
    it("verifies every positive in the frozen corpus", () => {
      const result = verify(externalResponseVerifier, {
        path: "tests/qa/fixtures/cleri-probe/external-response/verified.js",
        source: read("verified.js")
      });
      expect(result.verdict).toBe("VERIFIED");
      expect(verifiedLines(result)).toEqual([7, 13]);
    });

    it("reports no finding for any hard negative in the frozen corpus", () => {
      const result = verify(externalResponseVerifier, {
        path: "tests/qa/fixtures/cleri-probe/external-response/hard-negative.js",
        source: read("hard-negative.js")
      });
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("meets its labeled precision gate", () => {
      const score = assertFamilyGate(externalResponseVerifier);
      expect(score.precision).toBe(1);
      expect(score.recall).toBe(1);
    });
  });

  describe("robustness", () => {
    it("survives hostile and unsupported syntax without throwing", () => {
      for (const hostile of HOSTILE_SOURCES) {
        const result = verify(externalResponseVerifier, hostile);
        expect(["VERIFIED", "NO_FINDING"]).toContain(result.verdict);
      }
    });

    it("tolerates a candidate with no facts", () => {
      const result = externalResponseVerifier.verify(
        { path: MODULE, span: null, facts: null },
        { pathologyClass: "UNSAFE_EXTERNAL_RESPONSE_ACCESS" }
      );
      expect(result.verdict).toBe("NO_FINDING");
    });

    it("is byte-identical across 25 repetitions and within its fixture budget", () => {
      assertStableAndBounded(externalResponseVerifier, {
        path: "tests/qa/fixtures/cleri-probe/external-response/verified.js",
        source: read("verified.js")
      });
    });
  });
});
