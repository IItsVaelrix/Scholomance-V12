/**
 * SCHOLOMANCE DIV GRID MANIPULATOR — DOM LAYOUT INTEGRITY AUDIT
 * ══════════════════════════════════════════════════════════════════════════════
 * Domain: Bounded DOM Authoring & Deterministic Validation
 * Purpose: Automated QA suite validating nesting limits, style variant gating,
 *          route gates across environments, FNV-1a hashing, coordinate snapping,
 *          and DOMRect preview inspector interactions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { validateDivProposal, validateDivLayout } from '../../../codex/core/modulation/planner/div-layout-validator.js';
import { getAvailablePageComponents } from '../../../src/lib/routes.js';
import { snapToPixelGrid } from '../../../src/lib/engine.adapter.js';
import DivWandPage from '../../../src/pages/DivWand/DivWandPage.jsx';

describe('DIV Wand & Layout System — Core & Visual Validation Laws', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PROD', false); // Default to dev environment for router gating checks
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── 1. SCHEMA LIMITS & RECURSION DEPTH GAUNTLET ────────────────────────────

  describe('Nesting Depth Constraints', () => {
    it('accepts a nested layout at exactly depth 5 (depth-0 to depth-5)', () => {
      const validLayout = {
        id: "depth-0",
        type: "container",
        role: "wrapper",
        children: [{
          id: "depth-1",
          type: "container",
          role: "wrapper",
          children: [{
            id: "depth-2",
            type: "container",
            role: "wrapper",
            children: [{
              id: "depth-3",
              type: "container",
              role: "wrapper",
              children: [{
                id: "depth-4",
                type: "container",
                role: "wrapper",
                children: [{
                  id: "depth-5",
                  type: "element",
                  role: "text",
                  props: { text: "Leaf depth 5" }
                }]
              }]
            }]
          }]
        }]
      };

      const proposal = {
        rationale: "Valid depth 5 nesting validation test case",
        confidence: 0.99,
        reviewRequired: false,
        sourceIntentHash: "intent-depth-5",
        proposedLayout: validLayout
      };

      const outcome = validateDivProposal(proposal);
      expect(outcome.valid).toBe(true);
      expect(outcome.errors).toHaveLength(0);
    });

    it('rejects a nested layout at depth 6 (depth-0 to depth-6) with a BytecodeError', () => {
      const invalidLayout = {
        id: "depth-0",
        type: "container",
        role: "wrapper",
        children: [{
          id: "depth-1",
          type: "container",
          role: "wrapper",
          children: [{
            id: "depth-2",
            type: "container",
            role: "wrapper",
            children: [{
              id: "depth-3",
              type: "container",
              role: "wrapper",
              children: [{
                id: "depth-4",
                type: "container",
                role: "wrapper",
                children: [{
                  id: "depth-5",
                  type: "container",
                  role: "wrapper",
                  children: [{
                    id: "depth-6",
                    type: "element",
                    role: "text",
                    props: { text: "Leaf depth 6" }
                  }]
                }]
              }]
            }]
          }]
        }]
      };

      const proposal = {
        rationale: "Invalid depth 6 nesting validation test case",
        confidence: 0.99,
        reviewRequired: false,
        sourceIntentHash: "intent-depth-6",
        proposedLayout: invalidLayout
      };

      const outcome = validateDivProposal(proposal);
      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some(err => err.includes('Recursion depth exceeds maximum limit'))).toBe(true);
      expect(outcome.bytecodeError).toBeDefined();
      // Confirm it has structured bytecode fields conforming to BytecodeError specification
      expect(outcome.bytecodeError.bytecode).toMatch(/^PB-ERR-v1-FORMULA-CRIT-IMGFOR-0B03/);
    });
  });

  // ── 2. STYLING SECURITY & INJECTION SHIELD ───────────────────────────────

  describe('Key Security & Variant Integrity', () => {
    const makeBaseProposal = (proposedLayout) => ({
      rationale: "Key injection shield unit test",
      confidence: 0.90,
      reviewRequired: false,
      proposedLayout
    });

    it('rejects layout nodes with illegal or unrecognized top-level keys', () => {
      const badLayout = {
        id: "node-root",
        type: "element",
        role: "text",
        smuggledKey: "malicious-code",
        props: { text: "No smuggled properties allowed" }
      };

      const outcome = validateDivProposal(makeBaseProposal(badLayout));
      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some(err => err.includes('Unknown properties in layout node'))).toBe(true);
    });

    it('rejects raw CSS layout/style string properties or class injection fields', () => {
      const badLayout = {
        id: "node-root",
        type: "element",
        role: "text",
        className: "dangerous-override-class",
        onClick: "alert('XSS')",
        props: { text: "No custom classnames or onClick handlers in schema" }
      };

      const outcome = validateDivProposal(makeBaseProposal(badLayout));
      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some(err => err.includes('Unknown properties in layout node'))).toBe(true);
    });

    it('blocks unrecognized style variants, restricting strictly to the preconfigured grimoire variants', () => {
      const badStyleLayout = {
        id: "node-root",
        type: "container",
        role: "card",
        style: {
          variant: "unrecognizedVariant"
        }
      };

      const outcome = validateDivProposal(makeBaseProposal(badStyleLayout));
      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some(err => err.includes('Invalid style variant'))).toBe(true);
    });

    it('blocks arbitrary layout parameters outside of the structural schema list', () => {
      const badLayoutObj = {
        id: "node-root",
        type: "container",
        role: "card",
        layout: {
          display: "flex",
          arbitraryGlowOffset: 125, // not in allowed fields
        }
      };

      const outcome = validateDivProposal(makeBaseProposal(badLayoutObj));
      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some(err => err.includes('Unknown properties in layout object'))).toBe(true);
    });

    it('permits all valid style variants and validated numeric fields', () => {
      const validStyleLayout = {
        id: "node-root",
        type: "container",
        role: "card",
        layout: {
          display: "flex",
          position: "relative",
          width: 500,
          padding: 24,
          gap: 16
        },
        style: {
          variant: "glassmorphic",
          glowColor: "alchemy",
          borderRadius: 12,
          opacity: 0.85
        }
      };

      const outcome = validateDivProposal(makeBaseProposal(validStyleLayout));
      expect(outcome.valid).toBe(true);
      expect(outcome.errors).toHaveLength(0);
    });
  });

  // ── 3. ROUTE GATING & AUTHORIZATION GAUNTLET ────────────────────────────

  describe('Route Gating Integrity', () => {
    it('allows access to `/div-wand` in development mode for non-admin users', () => {
      vi.stubEnv('PROD', false);
      const user = { username: 'test-user', role: 'user', isAdmin: false };
      
      const availableComponents = getAvailablePageComponents(user);
      expect(availableComponents['/div-wand']).toBeDefined();
    });

    it('blocks access to `/div-wand` in production mode for non-admin users', () => {
      vi.stubEnv('PROD', true);
      const user = { username: 'test-user', role: 'user', isAdmin: false };
      
      const availableComponents = getAvailablePageComponents(user);
      expect(availableComponents['/div-wand']).toBeUndefined();
    });

    it('allows access to `/div-wand` in production mode for admin users', () => {
      vi.stubEnv('PROD', true);
      const user = { username: 'admin-user', role: 'admin', isAdmin: true };
      
      const availableComponents = getAvailablePageComponents(user);
      expect(availableComponents['/div-wand']).toBeDefined();
    });
  });

  // ── 4. DETERMINISTIC SNAPPING DOCTRINE ───────────────────────────────────

  describe('Pixel Grid Modulo Snapping', () => {
    it('snaps coordinates and offsets to 8px boundaries via the adapter snapping interface', () => {
      const coordinates = { x: 13.7, y: 25.1 };
      const snapped = snapToPixelGrid(coordinates, 8);

      expect(snapped.x).toBe(16);
      expect(snapped.y).toBe(24);
      expect(snapped.snappedX).toBe(16);
      expect(snapped.snappedY).toBe(24);
    });

    it('falls back gracefully to 1px snapping grid size if an invalid grid size is provided', () => {
      const coordinates = { x: 13.7, y: 25.1 };
      const snapped = snapToPixelGrid(coordinates, 0); // 0 or invalid triggers grid fallback to 1

      expect(snapped.x).toBe(14);
      expect(snapped.y).toBe(25);
    });
  });

  // ── 5. PAYLOAD OVERRUN SHIELD ───────────────────────────────────────────

  describe('Payload Size Budgets', () => {
    it('rejects proposals exceeding the maximum payload size budget of 64KB (65536 bytes)', () => {
      const hugeRationale = 'a'.repeat(70000);
      const hugeProposal = {
        rationale: hugeRationale,
        confidence: 0.95,
        reviewRequired: false,
        proposedLayout: {
          id: "root-huge",
          type: "element",
          role: "text",
          props: { text: "budget overflow test" }
        }
      };

      const outcome = validateDivProposal(hugeProposal);
      expect(outcome.valid).toBe(false);
      expect(outcome.errors.some(err => err.includes('exceeds limit of 65536'))).toBe(true);
      expect(outcome.bytecodeError).toBeDefined();
    });
  });

  // ── 6. INTERACTIVE INSPECTOR HUD & DOMRECT SNAPSHOTS ─────────────────────

  describe('Interactive Inspector HUD & DOMRect snapshots', () => {
    it('measures sandbox layout elements and populates the inspector HUD floating card', async () => {
      const { container } = render(React.createElement(DivWandPage));

      // 1. Assert that the page title renders beautifully
      const headerTitle = screen.getByText('DIV Wand');
      expect(headerTitle).toBeInTheDocument();

      // 2. Locate and toggle the Inspector HUD
      const inspectorButton = screen.getByText('Inspector');
      expect(inspectorButton).toBeInTheDocument();
      expect(inspectorButton).not.toHaveClass('dw-btn--active');

      await act(async () => {
        fireEvent.click(inspectorButton);
      });

      expect(inspectorButton).toHaveClass('dw-btn--active');

      // 3. Inspect a node rendered in JSDOM and mock its visual DOMRect bounds
      const spellCard = container.querySelector('#spell-card');
      expect(spellCard).toBeInTheDocument();

      // Mock clientRect parameters for absolute layout intent verification
      spellCard.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 200,
        top: 150,
        width: 320,
        height: 400,
        right: 520,
        bottom: 550,
        x: 200,
        y: 150
      });

      const previewRoot = container.querySelector('.dw-preview-root');
      expect(previewRoot).toBeInTheDocument();
      previewRoot.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 100,
        width: 800,
        height: 600,
        right: 900,
        bottom: 700,
        x: 100,
        y: 100
      });

      // 4. Trigger mouse entry on `#spell-card` with active inspector state
      await act(async () => {
        fireEvent.mouseOver(spellCard);
        fireEvent.mouseEnter(spellCard);
      });

      // Assert that hover highlights the element id and displays computed metrics relative to root
      const inspectHeading = screen.getByLabelText('Inspecting node spell-card');
      expect(inspectHeading).toBeInTheDocument();

      // Verify measured actual rect offsets compared to intent (left: 200 - rootLeft: 100 = 100; top: 150 - rootTop: 100 = 50)
      const measuredCoordinates = screen.getByText('x:100 y:50');
      expect(measuredCoordinates).toBeInTheDocument();

      const measuredWidth = screen.getAllByText('320px');
      expect(measuredWidth.length).toBeGreaterThan(0);

      const measuredHeight = screen.getAllByText('400px');
      expect(measuredHeight.length).toBeGreaterThan(0);

      // 5. Trigger mouse leave to clear inspector data safely
      await act(async () => {
        fireEvent.mouseOut(spellCard);
        fireEvent.mouseLeave(spellCard);
      });

      expect(container.querySelector('.dw-hud')).not.toBeInTheDocument();
    });
  });

});

describe('voxel node type', () => {
  it('accepts a valid voxel node', () => {
    const node = {
      id: 'crystal-bg',
      type: 'voxel',
      role: 'voxel-scene',
      props: { volumeSize: 32 },
    };
    const errors = validateDivLayout(node);
    expect(errors).toEqual([]);
  });

  it('accepts voxel node with text prop', () => {
    const node = {
      id: 'glyph-monuments',
      type: 'voxel',
      role: 'voxel-scene',
      props: { text: 'DAMIEN', volumeSize: 32 },
    };
    const errors = validateDivLayout(node);
    expect(errors).toEqual([]);
  });

  it('accepts voxel node with seed prop', () => {
    const node = {
      id: 'fibonacci-crystal',
      type: 'voxel',
      role: 'voxel-scene',
      props: { seed: { iterations: 6, scale: 0.75 }, volumeSize: 32 },
    };
    const errors = validateDivLayout(node);
    expect(errors).toEqual([]);
  });

  it('rejects voxel node with wrong role', () => {
    const node = {
      id: 'bad-voxel',
      type: 'voxel',
      role: 'text',
      props: {},
    };
    const errors = validateDivLayout(node);
    expect(errors.some(e => e.includes('voxel') || e.includes('role'))).toBe(true);
  });

  it('rejects unknown props on voxel node', () => {
    const node = {
      id: 'bad-props',
      type: 'voxel',
      role: 'voxel-scene',
      props: { unknownField: true },
    };
    const errors = validateDivLayout(node);
    expect(errors.some(e => e.includes('unknownField'))).toBe(true);
  });
});
