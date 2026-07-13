/**
 * Babel-based source-to-facts adapter for Cleri Probe.
 *
 * Pure service: accepts a path and source text, emits normalized structural
 * facts. No fs/process/network access.
 */

import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import {
  createSourceSpan,
  deepFreeze,
  normalizeRepositoryPath
} from "../../core/immunity/cleri-probe/contracts.js";
import { sha256Hex } from "../../core/immunity/cleri-probe/canonical-report.js";

const HOOKS = new Set([
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useMemo",
  "useCallback",
  "useImperativeHandle"
]);

const CONCURRENT_PRIMITIVES = new Set([
  "Promise.all",
  "Promise.allSettled",
  "Promise.race",
  "Promise.any"
]);

const MUTATING_METHODS = new Set([
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "reverse",
  "sort",
  "fill",
  "copyWithin",
  "delete"
]);

const CLIENT_PATTERNS = [
  { test: callee => callee === "fetch" || callee.startsWith("fetch."), client: "fetch" },
  { test: callee => callee === "axios" || callee.startsWith("axios."), client: "axios" },
  { test: callee => callee.includes("XMLHttpRequest"), client: "XMLHttpRequest" }
];

function isFunctionNode(node) {
  if (!node) return false;
  return (
    node.type === "FunctionDeclaration" ||
    node.type === "FunctionExpression" ||
    node.type === "ArrowFunctionExpression" ||
    node.type === "ObjectMethod" ||
    node.type === "ClassMethod" ||
    node.type === "ClassPrivateMethod"
  );
}

function buildLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function positionFromOffset(lineStarts, offset) {
  let line = 1;
  for (let i = 1; i < lineStarts.length; i++) {
    if (lineStarts[i] <= offset) line = i + 1;
    else break;
  }
  const column = offset - lineStarts[line - 1] + 1;
  return { line, column };
}

function canonicalDotted(node) {
  if (!node) return "";
  switch (node.type) {
    case "Identifier":
      return node.name;
    case "ThisExpression":
      return "this";
    case "Super":
      return "super";
    case "MemberExpression":
    case "OptionalMemberExpression": {
      const object = canonicalDotted(node.object);
      if (node.computed) {
        if (node.property.type === "StringLiteral" || node.property.type === "Literal") {
          return `${object}[${JSON.stringify(node.property.value)}]`;
        }
        return `${object}[?]`;
      }
      return `${object}.${node.property.name}`;
    }
    case "CallExpression":
    case "OptionalCallExpression":
      return `${canonicalDotted(node.callee)}()`;
    case "NewExpression":
      return `${canonicalDotted(node.callee)}()`;
    default:
      return `[${node.type}]`;
  }
}

function receiverOf(node) {
  if (node.type === "MemberExpression" || node.type === "OptionalMemberExpression") {
    return canonicalDotted(node.object);
  }
  return null;
}

function rootObjectName(node) {
  while (node && (node.type === "MemberExpression" || node.type === "OptionalMemberExpression")) {
    node = node.object;
  }
  return node && node.type === "Identifier" ? node.name : null;
}

function hookName(node) {
  if (node.type === "Identifier" && HOOKS.has(node.name)) return node.name;
  return null;
}

function clientForCallee(callee) {
  for (const pattern of CLIENT_PATTERNS) {
    if (pattern.test(callee)) return pattern.client;
  }
  return null;
}

function mutatingMethodName(node) {
  if (
    (node.type === "CallExpression" || node.type === "OptionalCallExpression") &&
    (node.callee.type === "MemberExpression" || node.callee.type === "OptionalMemberExpression") &&
    !node.callee.computed
  ) {
    return MUTATING_METHODS.has(node.callee.property.name) ? node.callee.property.name : null;
  }
  return null;
}

function collectIdentifierRoots(node, roots = []) {
  if (!node) return roots;
  switch (node.type) {
    case "Identifier":
      roots.push(node.name);
      break;
    case "MemberExpression":
    case "OptionalMemberExpression":
      collectIdentifierRoots(node.object, roots);
      break;
    case "UnaryExpression":
      collectIdentifierRoots(node.argument, roots);
      break;
    case "LogicalExpression":
    case "BinaryExpression":
      collectIdentifierRoots(node.left, roots);
      collectIdentifierRoots(node.right, roots);
      break;
    case "ConditionalExpression":
      collectIdentifierRoots(node.test, roots);
      break;
    case "CallExpression":
    case "OptionalCallExpression":
      collectIdentifierRoots(node.callee, roots);
      break;
    default:
      break;
  }
  return roots;
}

export function parseSourceFacts({ path, content }) {
  const normalizedPath = normalizeRepositoryPath(path);
  const source = String(content ?? "");
  const contentHash = sha256Hex(source);
  const parseContent = source.replace(/\r\n/g, "\n");
  const lineStarts = buildLineStarts(parseContent);

  const position = offset => positionFromOffset(lineStarts, Math.min(parseContent.length, Math.max(0, offset)));

  const makeId = (category, node) => {
    const start = position(node.start);
    const end = position(Math.max(node.start, node.end - 1));
    const payload = {
      category,
      path: normalizedPath,
      startLine: start.line,
      startColumn: start.column,
      endLine: end.line,
      endColumn: end.column
    };
    return `${category}-${sha256Hex(payload).slice(0, 16)}`;
  };

  const makeSpan = (node, symbol) => {
    const start = position(node.start);
    const end = position(Math.max(node.start, node.end - 1));
    return createSourceSpan({
      path: normalizedPath,
      startLine: start.line,
      startColumn: start.column,
      endLine: end.line,
      endColumn: end.column,
      symbol: symbol === undefined ? null : symbol,
      excerptDigest: sha256Hex(parseContent.slice(node.start, node.end))
    });
  };

  let ast;
  try {
    ast = parse(parseContent, {
      sourceType: "unambiguous",
      allowReturnOutsideFunction: true,
      plugins: [
        "typescript",
        "jsx",
        "classProperties",
        "objectRestSpread",
        "optionalChaining",
        "dynamicImport",
        "topLevelAwait",
        "decorators-legacy"
      ]
    });
  } catch (err) {
    const diagnostic = { code: "PARSE_FAILED", message: err.message };
    if (err.loc) {
      diagnostic.span = createSourceSpan({
        path: normalizedPath,
        startLine: err.loc.line,
        startColumn: err.loc.column,
        endLine: err.loc.line,
        endColumn: err.loc.column,
        symbol: null,
        excerptDigest: sha256Hex("")
      });
    }
    return deepFreeze({
      ok: false,
      path: normalizedPath,
      contentHash,
      functions: [],
      calls: [],
      effects: [],
      catchClauses: [],
      bindings: [],
      writes: [],
      externalRequests: [],
      guards: [],
      concurrentCallbacks: [],
      diagnostics: [deepFreeze(diagnostic)]
    });
  }

  const functions = [];
  const calls = [];
  const effects = [];
  const catchClauses = [];
  const bindings = [];
  const writes = [];
  const externalRequests = [];
  const guards = [];
  const concurrentCallbacks = [];

  const functionNodeToId = new Map();
  const functionStack = [];
  const bindingStack = [new Map()];
  const catchStack = [];
  const catchState = new Map();
  const ccStack = [];
  const effectCandidates = [];

  const currentFunction = () => functionStack[functionStack.length - 1];
  const currentScope = () => bindingStack[bindingStack.length - 1];
  const currentCatchId = () => catchStack[catchStack.length - 1];
  const currentConcurrentCallbackId = () => ccStack[ccStack.length - 1] ?? null;

  const resolveBinding = name => {
    for (let i = bindingStack.length - 1; i >= 0; i--) {
      const id = bindingStack[i].get(name);
      if (id) return id;
    }
    return null;
  };

  const addBinding = (name, kind, functionId, idNode) => {
    const id = makeId("binding", idNode);
    currentScope().set(name, id);
    bindings.push({
      id,
      name,
      kind,
      functionId,
      declarationSpan: makeSpan(idNode, name)
    });
    return id;
  };

  const extractPatternBindings = (pattern, kind, functionId) => {
    if (!pattern) return;
    if (pattern.type === "Identifier") {
      addBinding(pattern.name, kind, functionId, pattern);
      return;
    }
    if (pattern.type === "ArrayPattern") {
      for (const element of pattern.elements) {
        if (element) extractPatternBindings(element, kind, functionId);
      }
      return;
    }
    if (pattern.type === "ObjectPattern") {
      for (const prop of pattern.properties) {
        if (prop.type === "ObjectProperty") {
          extractPatternBindings(prop.value, kind, functionId);
        } else if (prop.type === "RestElement") {
          extractPatternBindings(prop.argument, kind, functionId);
        }
      }
      return;
    }
    if (pattern.type === "AssignmentPattern") {
      extractPatternBindings(pattern.left, kind, functionId);
      return;
    }
    if (pattern.type === "RestElement") {
      extractPatternBindings(pattern.argument, kind, functionId);
    }
  };

  const detectConcurrentCallbackContext = path => {
    const parentPath = path.parentPath;
    const grandPath = parentPath?.parentPath;
    if (!grandPath) return null;
    const grand = grandPath.node;
    if (
      (grand.type === "CallExpression" || grand.type === "OptionalCallExpression") &&
      CONCURRENT_PRIMITIVES.has(canonicalDotted(grand.callee))
    ) {
      const primitive = canonicalDotted(grand.callee);
      const parent = parentPath.node;
      if (parent.type === "ArrayExpression") return primitive;
      if (
        (parent.type === "CallExpression" || parent.type === "OptionalCallExpression") &&
        /\.(map|filter|flatMap|forEach|reduce)$/.test(canonicalDotted(parent.callee))
      ) {
        return primitive;
      }
    }
    return null;
  };

  const enterFunction = (path, name) => {
    const parentFunctionId = currentFunction() ? currentFunction().id : null;
    const id = makeId("fn", path.node);
    functionNodeToId.set(path.node, id);
    functions.push({
      id,
      name,
      span: makeSpan(path.node, name),
      parentFunctionId,
      async: Boolean(path.node.async)
    });
    functionStack.push({ id, node: path.node });
    bindingStack.push(new Map());
    for (const param of path.node.params) {
      extractPatternBindings(param, "param", id);
    }

    const primitive = detectConcurrentCallbackContext(path);
    if (primitive) {
      const ccId = makeId("cc", path.node);
      concurrentCallbacks.push({
        id: ccId,
        primitive,
        functionId: parentFunctionId,
        callbackFunctionId: id,
        span: makeSpan(path.node)
      });
      ccStack.push(ccId);
      return ccId;
    }
    return null;
  };

  const exitFunction = ccId => {
    functionStack.pop();
    bindingStack.pop();
    if (ccId) ccStack.pop();
  };

  // Root / program function.
  const program = ast.program;
  const rootId = makeId("fn", program);
  functionNodeToId.set(program, rootId);
  functions.push({
    id: rootId,
    name: null,
    span: makeSpan(program),
    parentFunctionId: null,
    async: false
  });
  functionStack.push({ id: rootId, node: program });

  const functionCcIds = new Map();

  traverse(ast, {
    FunctionDeclaration: {
      enter(path) {
        const name = path.node.id ? path.node.id.name : null;
        if (name) addBinding(name, "function", currentFunction().id, path.node.id);
        functionCcIds.set(path.node, enterFunction(path, name));
      },
      exit(path) {
        exitFunction(functionCcIds.get(path.node));
        functionCcIds.delete(path.node);
      }
    },
    FunctionExpression: {
      enter(path) {
        const name = path.node.id ? path.node.id.name : null;
        const ccId = enterFunction(path, name);
        if (name) addBinding(name, "function", currentFunction().id, path.node.id);
        functionCcIds.set(path.node, ccId);
      },
      exit(path) {
        exitFunction(functionCcIds.get(path.node));
        functionCcIds.delete(path.node);
      }
    },
    ArrowFunctionExpression: {
      enter(path) {
        functionCcIds.set(path.node, enterFunction(path, null));
      },
      exit(path) {
        exitFunction(functionCcIds.get(path.node));
        functionCcIds.delete(path.node);
      }
    },
    ObjectMethod: {
      enter(path) {
        const key = path.node.key;
        const name = key.type === "Identifier" && !path.node.computed ? key.name : null;
        functionCcIds.set(path.node, enterFunction(path, name));
      },
      exit(path) {
        exitFunction(functionCcIds.get(path.node));
        functionCcIds.delete(path.node);
      }
    },
    ClassMethod: {
      enter(path) {
        const key = path.node.key;
        const name = key.type === "Identifier" && !path.node.computed ? key.name : null;
        functionCcIds.set(path.node, enterFunction(path, name));
      },
      exit(path) {
        exitFunction(functionCcIds.get(path.node));
        functionCcIds.delete(path.node);
      }
    },
    ClassPrivateMethod: {
      enter(path) {
        functionCcIds.set(path.node, enterFunction(path, `#${path.node.key.id.name}`));
      },
      exit(path) {
        exitFunction(functionCcIds.get(path.node));
        functionCcIds.delete(path.node);
      }
    },
    VariableDeclaration(path) {
      const kind = path.node.kind;
      for (const declarator of path.node.declarations) {
        extractPatternBindings(declarator.id, kind, currentFunction().id);
      }
    },
    ImportDeclaration(path) {
      for (const specifier of path.node.specifiers) {
        if (specifier.type === "ImportDefaultSpecifier" ||
            specifier.type === "ImportSpecifier" ||
            specifier.type === "ImportNamespaceSpecifier") {
          addBinding(specifier.local.name, "import", currentFunction().id, specifier.local);
        }
      }
    },
    ClassDeclaration(path) {
      if (path.node.id) {
        addBinding(path.node.id.name, "class", currentFunction().id, path.node.id);
      }
    },
    CatchClause: {
      enter(path) {
        const id = makeId("catch", path.node);
        catchStack.push(id);
        catchState.set(id, {
          bodyStatementKinds: [],
          calls: [],
          throws: false,
          returns: false
        });
        bindingStack.push(new Map());
        extractPatternBindings(path.node.param, "catch", currentFunction().id);
      },
      exit(path) {
        const id = catchStack.pop();
        const state = catchState.get(id);
        state.bodyStatementKinds = path.node.body.body.map(stmt => stmt.type);
        catchClauses.push({
          id,
          functionId: currentFunction().id,
          bodyStatementKinds: state.bodyStatementKinds,
          calls: state.calls,
          throws: state.throws,
          returns: state.returns,
          span: makeSpan(path.node)
        });
        bindingStack.pop();
        catchState.delete(id);
      }
    },
    CallExpression(path) {
      recordCall(path);
    },
    OptionalCallExpression(path) {
      recordCall(path);
    },
    IfStatement(path) {
      recordGuards(path.node.test, path.node);
    },
    ConditionalExpression(path) {
      recordGuards(path.node.test, path.node);
    },
    ThrowStatement(path) {
      const id = currentCatchId();
      if (id) catchState.get(id).throws = true;
    },
    ReturnStatement(path) {
      const id = currentCatchId();
      if (id) catchState.get(id).returns = true;
    },
    AssignmentExpression(path) {
      recordWrite(path.node, path.node.operator, path.node.left);
    },
    UpdateExpression(path) {
      recordWrite(path.node, path.node.operator, path.node.argument);
    }
  });

  function recordCall(path) {
    const node = path.node;
    const callee = canonicalDotted(node.callee);
    const receiver = receiverOf(node.callee);
    const argumentKinds = node.arguments.map(arg => arg.type);
    const id = makeId("call", node);
    const functionId = currentFunction().id;
    calls.push({ id, callee, receiver, argumentKinds, functionId, span: makeSpan(node) });

    const catchId = currentCatchId();
    if (catchId) catchState.get(catchId).calls.push(id);

    const hook = hookName(node.callee);
    if (hook && node.arguments[0] && isFunctionNode(node.arguments[0])) {
      effectCandidates.push({ hook, callbackNode: node.arguments[0], callNode: node });
    }

    const methodName = mutatingMethodName(node);
    if (methodName) {
      const rootName = rootObjectName(node.callee);
      writes.push({
        bindingId: rootName ? resolveBinding(rootName) : null,
        operation: methodName,
        functionId,
        concurrentCallbackId: currentConcurrentCallbackId(),
        span: makeSpan(node)
      });
    }

    const client = clientForCallee(callee);
    if (client) {
      const bindingId = externalRequestBindingId(path);
      externalRequests.push({
        bindingId,
        client,
        functionId,
        span: makeSpan(node)
      });
    }
  }

  function externalRequestBindingId(path) {
    const grand = path.parentPath?.parentPath?.node;
    if (grand && grand.type === "VariableDeclarator" && grand.id.type === "Identifier") {
      return resolveBinding(grand.id.name);
    }
    const parent = path.parentPath?.node;
    if (parent && parent.type === "VariableDeclarator" && parent.id.type === "Identifier") {
      return resolveBinding(parent.id.name);
    }
    return null;
  }

  function recordWrite(node, operator, left) {
    let bindingId = null;
    let rootName = null;
    if (left.type === "Identifier") {
      rootName = left.name;
      bindingId = resolveBinding(rootName);
    } else if (left.type === "MemberExpression" || left.type === "OptionalMemberExpression") {
      rootName = rootObjectName(left);
      bindingId = rootName ? resolveBinding(rootName) : null;
    }
    if (!bindingId && !rootName) return;
    writes.push({
      bindingId,
      operation: operator,
      functionId: currentFunction().id,
      concurrentCallbackId: currentConcurrentCallbackId(),
      span: makeSpan(node)
    });
  }

  function recordGuards(testNode, statementNode) {
    const roots = [...new Set(collectIdentifierRoots(testNode))];
    for (const name of roots) {
      const bindingId = resolveBinding(name);
      if (bindingId) {
        guards.push({
          bindingId,
          kind: "TRUTHY",
          functionId: currentFunction().id,
          span: makeSpan(statementNode)
        });
      }
    }
  }

  // Resolve effect cleanup callbacks now that every function has an id.
  for (const candidate of effectCandidates) {
    const callbackFunctionId = functionNodeToId.get(candidate.callbackNode) || null;
    let returnFunctionId = null;
    if (callbackFunctionId) {
      returnFunctionId = findReturnFunctionId(candidate.callbackNode);
    }
    effects.push({
      id: makeId("effect", candidate.callNode),
      hook: candidate.hook,
      callbackFunctionId,
      returnFunctionId,
      span: makeSpan(candidate.callNode)
    });
  }

  function findReturnFunctionId(callbackNode) {
    if (isFunctionNode(callbackNode.body)) {
      return functionNodeToId.get(callbackNode.body) || null;
    }
    if (callbackNode.body && callbackNode.body.type === "BlockStatement") {
      for (const stmt of callbackNode.body.body) {
        if (stmt.type === "ReturnStatement" && isFunctionNode(stmt.argument)) {
          return functionNodeToId.get(stmt.argument) || null;
        }
      }
    }
    return null;
  }

  return deepFreeze({
    ok: true,
    path: normalizedPath,
    contentHash,
    functions,
    calls,
    effects,
    catchClauses,
    bindings,
    writes,
    externalRequests,
    guards,
    concurrentCallbacks,
    diagnostics: []
  });
}
