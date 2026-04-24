import { afterEach, describe, it } from "vitest";
import { ScholomanceDictionaryAPI } from "../../src/lib/scholomanceDictionary.api.js";
import {
  assertEqual,
  assertTrue,
} from "../qa/tools/bytecode-assertions.js";

const originalViteUrl = process.env.VITE_SCHOLOMANCE_DICT_API_URL;
const originalServerUrl = process.env.SCHOLOMANCE_DICT_API_URL;

function restoreEnv() {
  if (originalViteUrl === undefined) {
    delete process.env.VITE_SCHOLOMANCE_DICT_API_URL;
  } else {
    process.env.VITE_SCHOLOMANCE_DICT_API_URL = originalViteUrl;
  }

  if (originalServerUrl === undefined) {
    delete process.env.SCHOLOMANCE_DICT_API_URL;
  } else {
    process.env.SCHOLOMANCE_DICT_API_URL = originalServerUrl;
  }
}

describe("ScholomanceDictionaryAPI", () => {
  const testContext = {
    testFile: "scholomanceDictionary.api.test.js",
    testSuite: "ScholomanceDictionaryAPI",
  };

  afterEach(() => {
    restoreEnv();
  });

  it("appends the lexicon path for a bare local dictionary host", () => {
    process.env.VITE_SCHOLOMANCE_DICT_API_URL = "http://127.0.0.1:8787";
    delete process.env.SCHOLOMANCE_DICT_API_URL;

    assertEqual(
      ScholomanceDictionaryAPI.getBaseUrl(),
      "http://127.0.0.1:8787/api/lexicon",
      { ...testContext, testName: "appends lexicon path for bare host" },
    );
  });

  it("preserves an explicit lexicon path", () => {
    process.env.VITE_SCHOLOMANCE_DICT_API_URL = "http://127.0.0.1:8787/api/lexicon/";
    delete process.env.SCHOLOMANCE_DICT_API_URL;

    assertEqual(
      ScholomanceDictionaryAPI.getBaseUrl(),
      "http://127.0.0.1:8787/api/lexicon",
      { ...testContext, testName: "preserves explicit lexicon path" },
    );
  });

  it("defaults to the same-origin lexicon route when no public env is provided", () => {
    delete process.env.VITE_SCHOLOMANCE_DICT_API_URL;
    delete process.env.SCHOLOMANCE_DICT_API_URL;

    assertEqual(
      ScholomanceDictionaryAPI.getBaseUrl(),
      "/api/lexicon",
      { ...testContext, testName: "defaults to same-origin lexicon route" },
    );
    assertTrue(
      ScholomanceDictionaryAPI.isConfigured(),
      { ...testContext, testName: "treats same-origin lexicon route as configured" },
    );
  });
});
