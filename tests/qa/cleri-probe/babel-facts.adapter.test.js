import { describe, expect, it } from "vitest";
import { parseSourceFacts } from "../../../codex/services/cleri-probe/babel-facts.adapter.js";

describe("parseSourceFacts", () => {
  it("captures lifecycle, catch, response, and concurrency facts", () => {
    const result = parseSourceFacts({
      path: "src/example.tsx",
      content: [
        "useEffect(() => {",
        "  window.addEventListener('resize', onResize);",
        "}, []);",
        "try { await work(); } catch (error) { console.error(error); }",
        "const response = await fetch(url);",
        "return response.json();",
        "await Promise.all(items.map(async item => { shared.push(item); }));"
      ].join("\n")
    });
    expect(result.ok).toBe(true);
    expect(result.calls.some(call => call.callee === "window.addEventListener")).toBe(true);
    expect(result.catchClauses).toHaveLength(1);
    expect(result.concurrentCallbacks).toHaveLength(1);
  });

  it("returns a diagnostic instead of throwing on invalid syntax", () => {
    const result = parseSourceFacts({ path: "broken.js", content: "const = ;" });
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe("PARSE_FAILED");
  });

  it("freezes the returned fact graph recursively", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "function f() { Math.random(); }"
    });
    expect(result.ok).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.calls)).toBe(true);
    expect(Object.isFrozen(result.functions[0])).toBe(true);
  });

  it("stores excerpt digests instead of source text", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "fetch(url);"
    });
    const call = result.calls[0];
    expect(call.span.excerptDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(call.span).not.toHaveProperty("excerpt");
  });

  it("produces identical structural facts for CRLF and LF line endings", () => {
    const source = "function f() {\n  window.addEventListener('x', g);\n}";
    const lf = parseSourceFacts({ path: "a.js", content: source });
    const crlf = parseSourceFacts({ path: "a.js", content: source.replace(/\n/g, "\r\n") });
    expect(lf.ok).toBe(true);
    expect(crlf.ok).toBe(true);
    expect(stripVolatile(lf)).toEqual(stripVolatile(crlf));
  });

  it("remains stable when identifiers are renamed without changing semantics", () => {
    const before = parseSourceFacts({
      path: "a.js",
      content: [
        "function Alpha() {",
        "  useEffect(() => {",
        "    window.addEventListener('resize', handler);",
        "  }, []);",
        "}"
      ].join("\n")
    });
    const after = parseSourceFacts({
      path: "a.js",
      content: [
        "function Omega() {",
        "  useEffect(() => {",
        "    window.addEventListener('resize', manager);",
        "  }, []);",
        "}"
      ].join("\n")
    });
    expect(after.ok).toBe(true);
    expect(callSignatures(after)).toEqual(callSignatures(before));
    expect(after.effects).toHaveLength(before.effects.length);
    expect(after.functions).toHaveLength(before.functions.length);
    expect(after.bindings).toHaveLength(before.bindings.length);
  });

  it("parses TypeScript annotations without changing call facts", () => {
    const js = parseSourceFacts({
      path: "a.js",
      content: "function f(x) { return fetch(x); }"
    });
    const ts = parseSourceFacts({
      path: "a.ts",
      content: "function f(x: string): Promise<any> { return fetch(x); }"
    });
    expect(ts.ok).toBe(true);
    expect(callSignatures(js)).toEqual(callSignatures(ts));
  });

  it("parses JSX without changing hook and call facts", () => {
    const result = parseSourceFacts({
      path: "a.jsx",
      content: [
        "function Component() {",
        "  useEffect(() => {",
        "    window.addEventListener('scroll', handler);",
        "  }, []);",
        "  return <div />;",
        "}"
      ].join("\n")
    });
    expect(result.ok).toBe(true);
    expect(result.calls.some(call => call.callee === "window.addEventListener")).toBe(true);
    expect(result.effects).toHaveLength(1);
  });

  it("canonicalizes optional chaining into dotted callee strings", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "obj?.method?.();"
    });
    expect(result.ok).toBe(true);
    expect(result.calls[0].callee).toBe("obj.method");
  });

  it("records anonymous callbacks with null name", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "items.map(item => item);"
    });
    expect(result.ok).toBe(true);
    expect(result.functions.some(fn => fn.name === null)).toBe(true);
  });

  it("extracts destructured bindings", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "const { a, b: c } = obj;"
    });
    expect(result.ok).toBe(true);
    const names = result.bindings.map(b => b.name).sort();
    expect(names).toEqual(["a", "c"]);
  });

  it("registers simple function parameters as bindings", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "function f(x) { if (x) x.push(1); }"
    });
    expect(result.ok).toBe(true);
    const fn = result.functions.find(f => f.name === "f");
    const binding = result.bindings.find(b => b.name === "x");
    expect(binding).toBeDefined();
    expect(binding.kind).toBe("param");
    expect(binding.functionId).toBe(fn.id);
    expect(result.guards[0].bindingId).toBe(binding.id);
    expect(result.writes[0].bindingId).toBe(binding.id);
  });

  it("registers destructured function parameters as bindings", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "function f({ a, b: c }, [d, ...rest]) { a.push(d); rest.push(c); }"
    });
    expect(result.ok).toBe(true);
    const fn = result.functions.find(f => f.name === "f");
    const paramNames = result.bindings
      .filter(b => b.kind === "param")
      .map(b => b.name)
      .sort();
    expect(paramNames).toEqual(["a", "c", "d", "rest"]);
    expect(result.bindings.filter(b => b.kind === "param").every(b => b.functionId === fn.id)).toBe(true);
    expect(result.writes.every(w => w.bindingId !== null)).toBe(true);
  });

  it("resolves parameter bindings in verifier-like queries", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "function f(x) { if (x) x.push(1); }"
    });
    expect(result.ok).toBe(true);
    const paramBinding = result.bindings.find(b => b.name === "x" && b.kind === "param");
    expect(paramBinding).toBeDefined();
    expect(result.guards.every(g => g.bindingId === paramBinding.id)).toBe(true);
    expect(result.writes.every(w => w.bindingId === paramBinding.id)).toBe(true);
  });

  it("ignores calls that only appear inside comments", () => {
    const result = parseSourceFacts({
      path: "a.js",
      content: "// window.addEventListener('x')\n/* Math.random() */"
    });
    expect(result.ok).toBe(true);
    expect(result.calls).toHaveLength(0);
  });
});

function stripVolatile(result) {
  return {
    ...result,
    contentHash: "[hash]",
    functions: result.functions.map(f => ({ ...f, span: stripSpan(f.span) })),
    calls: result.calls.map(c => ({ ...c, span: stripSpan(c.span) })),
    effects: result.effects.map(e => ({ ...e, span: stripSpan(e.span) })),
    catchClauses: result.catchClauses.map(c => ({ ...c, span: stripSpan(c.span) })),
    bindings: result.bindings.map(b => ({ ...b, declarationSpan: stripSpan(b.declarationSpan) })),
    writes: result.writes.map(w => ({ ...w, span: stripSpan(w.span) })),
    externalRequests: result.externalRequests.map(r => ({ ...r, span: stripSpan(r.span) })),
    guards: result.guards.map(g => ({ ...g, span: stripSpan(g.span) })),
    concurrentCallbacks: result.concurrentCallbacks.map(cc => ({ ...cc, span: stripSpan(cc.span) }))
  };
}

function stripSpan(span) {
  return { ...span, excerptDigest: "[digest]" };
}

function callSignatures(result) {
  return result.calls
    .map(c => ({
      callee: c.callee,
      receiver: c.receiver,
      argumentKinds: c.argumentKinds
    }))
    .sort((a, b) => a.callee.localeCompare(b.callee));
}
