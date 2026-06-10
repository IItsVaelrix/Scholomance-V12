import { parse } from '@babel/parser';
import traversePkg from '@babel/traverse';

// @babel/traverse ships a CJS default export; normalize for ESM.
const traverse = traversePkg.default ?? traversePkg;

/**
 * Parse code and return the pre-order sequence of AST node types.
 * Name-agnostic and sound-agnostic: only structure survives.
 * @param {string} code
 * @returns {string[]} ordered node-type states (empty on bad input)
 */
export function tokenizeToStates(code) {
  if (typeof code !== 'string' || code.trim().length === 0) return [];

  let ast;
  try {
    ast = parse(code, {
      sourceType: 'unambiguous',
      errorRecovery: true,
      plugins: ['typescript', 'jsx'],
    });
  } catch {
    return [];
  }

  const states = [];
  try {
    traverse(ast, {
      enter(path) {
        states.push(path.node.type);
      },
    });
  } catch {
    return [];
  }
  return states;
}
