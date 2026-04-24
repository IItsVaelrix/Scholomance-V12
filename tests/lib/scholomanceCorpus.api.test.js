import { afterEach, describe, it } from "vitest";

import { ScholomanceCorpusAPI } from "../../src/lib/scholomanceCorpus.api.js";
import {
  assertEqual,
  assertTrue,
} from "../qa/tools/bytecode-assertions.js";

const originalViteCorpusUrl = process.env.VITE_SCHOLOMANCE_CORPUS_API_URL;
const originalServerCorpusUrl = process.env.SCHOLOMANCE_CORPUS_API_URL;
const originalViteDictUrl = process.env.VITE_SCHOLOMANCE_DICT_API_URL;
const originalServerDictUrl = process.env.SCHOLOMANCE_DICT_API_URL;

function restoreEnv() {
  if (originalViteCorpusUrl === undefined) {
    delete process.env.VITE_SCHOLOMANCE_CORPUS_API_URL;
  } else {
    process.env.VITE_SCHOLOMANCE_CORPUS_API_URL = originalViteCorpusUrl;
  }

  if (originalServerCorpusUrl === undefined) {
    delete process.env.SCHOLOMANCE_CORPUS_API_URL;
  } else {
    process.env.SCHOLOMANCE_CORPUS_API_URL = originalServerCorpusUrl;
  }

  if (originalViteDictUrl === undefined) {
    delete process.env.VITE_SCHOLOMANCE_DICT_API_URL;
  } else {
    process.env.VITE_SCHOLOMANCE_DICT_API_URL = originalViteDictUrl;
  }

  if (originalServerDictUrl === undefined) {
    delete process.env.SCHOLOMANCE_DICT_API_URL;
  } else {
    process.env.SCHOLOMANCE_DICT_API_URL = originalServerDictUrl;
  }
}

describe("ScholomanceCorpusAPI", () => {
  const testContext = {
    testFile: "scholomanceCorpus.api.test.js",
    testSuite: "ScholomanceCorpusAPI",
  };

  afterEach(() => {
    restoreEnv();
  });

  it("defaults to the same-origin corpus route when no public env is provided", () => {
    delete process.env.VITE_SCHOLOMANCE_CORPUS_API_URL;
    delete process.env.SCHOLOMANCE_CORPUS_API_URL;
    delete process.env.VITE_SCHOLOMANCE_DICT_API_URL;
    delete process.env.SCHOLOMANCE_DICT_API_URL;

    assertEqual(
      ScholomanceCorpusAPI.getBaseUrl(),
      "/api/corpus",
      { ...testContext, testName: "defaults to same-origin corpus route" },
    );
    assertTrue(
      ScholomanceCorpusAPI.isEnabled(),
      { ...testContext, testName: "treats same-origin corpus route as enabled" },
    );
  });

  it("derives the corpus route from a bare dictionary host override", () => {
    process.env.VITE_SCHOLOMANCE_DICT_API_URL = "http://127.0.0.1:8787";
    delete process.env.SCHOLOMANCE_DICT_API_URL;
    delete process.env.VITE_SCHOLOMANCE_CORPUS_API_URL;
    delete process.env.SCHOLOMANCE_CORPUS_API_URL;

    assertEqual(
      ScholomanceCorpusAPI.getBaseUrl(),
      "http://127.0.0.1:8787/api/corpus",
      { ...testContext, testName: "derives corpus path from dictionary host override" },
    );
  });

  it("prefers an explicit corpus override when provided", () => {
    process.env.VITE_SCHOLOMANCE_CORPUS_API_URL = "https://scholomance.example.com/api/corpus/";
    delete process.env.SCHOLOMANCE_CORPUS_API_URL;

    assertEqual(
      ScholomanceCorpusAPI.getBaseUrl(),
      "https://scholomance.example.com/api/corpus",
      { ...testContext, testName: "preserves explicit corpus path override" },
    );
  });
});
