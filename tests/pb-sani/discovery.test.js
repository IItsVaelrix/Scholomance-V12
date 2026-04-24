import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildSymbolGraph } from '../../scripts/pb-sani/discovery.js';

function createTempRoot() {
  return mkdtempSync(join(tmpdir(), 'pb-sani-discovery-'));
}

function writeFile(root, relPath, source) {
  const filePath = join(root, relPath);
  mkdirSync(join(filePath, '..'), { recursive: true });
  writeFileSync(filePath, source, 'utf8');
}

function getSymbol(graph, filePath, symbolName) {
  return graph.allExports.get(`${filePath}::${symbolName}`);
}

const tempRoots = [];

afterEach(() => {
  while (tempRoots.length) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('PB-SANI discovery engine', () => {
  it('treats dynamic import() routes as import edges', () => {
    const root = createTempRoot();
    tempRoots.push(root);

    writeFile(root, 'src/pages/Collab/CollabPage.jsx', `
      export default function CollabPage() {
        return null;
      }
    `);
    writeFile(root, 'src/lib/lazyWithRetry.js', `
      export function lazyWithRetry(loader) {
        return loader;
      }
    `);
    writeFile(root, 'src/lib/routes.js', `
      import { lazyWithRetry } from "./lazyWithRetry.js";

      export const CollabPage = lazyWithRetry(() => import("../pages/Collab/CollabPage.jsx"), "collab-page");
    `);

    const graph = buildSymbolGraph(root);
    const collabPage = getSymbol(graph, 'src/pages/Collab/CollabPage.jsx', 'CollabPage');

    expect(collabPage).toBeDefined();
    expect(collabPage.importedBy).toContain('src/lib/routes.js');
  });

  it('treats JSX component rendering as an execution path', () => {
    const root = createTempRoot();
    tempRoots.push(root);

    writeFile(root, 'src/components/Child.jsx', `
      export default function Child() {
        return null;
      }
    `);
    writeFile(root, 'src/components/Parent.jsx', `
      import Child from "./Child.jsx";

      export default function Parent() {
        return <Child />;
      }
    `);

    const graph = buildSymbolGraph(root);
    const child = getSymbol(graph, 'src/components/Child.jsx', 'Child');

    expect(child).toBeDefined();
    expect(child.calledBy).toContain('src/components/Parent.jsx');
  });

  it('tracks imports by symbol instead of marking every export in a module as imported', () => {
    const root = createTempRoot();
    tempRoots.push(root);

    writeFile(root, 'src/lib/core.js', `
      export function usedFn() {
        return 1;
      }

      export function unusedFn() {
        return 2;
      }
    `);
    writeFile(root, 'src/lib/consumer.js', `
      import { usedFn } from "./core.js";

      export function consume() {
        return usedFn();
      }
    `);

    const graph = buildSymbolGraph(root);
    const usedFn = getSymbol(graph, 'src/lib/core.js', 'usedFn');
    const unusedFn = getSymbol(graph, 'src/lib/core.js', 'unusedFn');

    expect(usedFn.importedBy).toContain('src/lib/consumer.js');
    expect(usedFn.calledBy).toContain('src/lib/consumer.js');
    expect(unusedFn.importedBy).toEqual([]);
    expect(unusedFn.calledBy).toEqual([]);
  });

  it('marks same-file references as an active local path', () => {
    const root = createTempRoot();
    tempRoots.push(root);

    writeFile(root, 'src/lib/battle.js', `
      export const INITIAL_GRID_SIZE = 9;

      export function createGrid(size = INITIAL_GRID_SIZE) {
        return size;
      }
    `);

    const graph = buildSymbolGraph(root);
    const gridSize = getSymbol(graph, 'src/lib/battle.js', 'INITIAL_GRID_SIZE');

    expect(gridSize.type).toBe('const');
    expect(gridSize.localRefs).toContain('src/lib/battle.js');
  });

  it('ignores archive reference docs during discovery', () => {
    const root = createTempRoot();
    tempRoots.push(root);

    writeFile(root, 'ARCHIVE REFERENCE DOCS/pb-sani/archive-me.js', `
      export function archivedUtility() {
        return "ignored";
      }
    `);
    writeFile(root, 'src/lib/active.js', `
      export function activeUtility() {
        return "kept";
      }
    `);

    const graph = buildSymbolGraph(root);

    expect(getSymbol(graph, 'ARCHIVE REFERENCE DOCS/pb-sani/archive-me.js', 'archivedUtility')).toBeUndefined();
    expect(getSymbol(graph, 'src/lib/active.js', 'activeUtility')).toBeDefined();
  });

  it('treats imported callbacks and value references as active usage', () => {
    const root = createTempRoot();
    tempRoots.push(root);

    writeFile(root, 'src/server/routes.js', `
      export function combatRoutes() {
        return null;
      }
    `);
    writeFile(root, 'src/server/index.js', `
      import { combatRoutes } from "./routes.js";

      const registry = {
        route: combatRoutes,
      };

      export function boot(fastify) {
        fastify.register(combatRoutes);
        return registry;
      }
    `);

    const graph = buildSymbolGraph(root);
    const combatRoutes = getSymbol(graph, 'src/server/routes.js', 'combatRoutes');

    expect(combatRoutes.importedBy).toContain('src/server/index.js');
    expect(combatRoutes.referencedBy).toContain('src/server/index.js');
  });
});
