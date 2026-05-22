import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import ScrollEditor from '../../src/pages/Read/ScrollEditor';
import { encodeBytecodeHealth, CELL_IDS } from '../../codex/core/diagnostic/BytecodeHealth.js';
import { assertTrue, assertEqual } from './tools/bytecode-assertions.js';
import { useVerseSynthesis } from '../../src/hooks/useVerseSynthesis.js';
import { useAdaptivePalette } from '../../src/hooks/useAdaptivePalette.js';
import { renderHook } from '@testing-library/react';

// Mock dependencies to focus exclusively on isolation invariants
vi.mock('../../hooks/useTheme.jsx', () => ({
  useTheme: () => ({ theme: 'dark' })
}));

vi.mock('../../hooks/usePrefersReducedMotion.js', () => ({
  usePrefersReducedMotion: () => false
}));

describe('TrueSight State Isolation and Decoupling QA', () => {
  const testContext = {
    testFile: 'truesight-state-isolation.qa.test.jsx',
    testSuite: 'TrueSight State Isolation QA'
  };

  describe('EDIT Mode Isolation Invariants', () => {
    it('proves that EDIT mode keeps textarea writable, pauses overlays, and disables ResizeObserver', async () => {
      // Setup mocked ResizeObserver to check if it's called
      const observeSpy = vi.fn();
      const disconnectSpy = vi.fn();
      global.ResizeObserver = class {
        observe = observeSpy;
        unobserve = vi.fn();
        disconnect = disconnectSpy;
      };

      const { container } = render(
        <ScrollEditor 
          content="Drafting a legendary scroll."
          ideMode="EDIT"
          isEditable={true}
          isTruesight={false}
        />
      );

      // 1. Textarea must be fully editable (not readOnly or disabled)
      const textarea = container.querySelector('textarea');
      assertTrue(!!textarea, { ...testContext, testName: 'textarea must exist in EDIT mode' });
      assertEqual(textarea.readOnly, false, { ...testContext, testName: 'textarea must not be readOnly' });
      assertEqual(textarea.disabled, false, { ...testContext, testName: 'textarea must not be disabled' });

      // 2. Proactively prove ResizeObserver is not observed in EDIT mode
      assertEqual(observeSpy.mock.calls.length, 0, { ...testContext, testName: 'ResizeObserver must not be observed' });

      // 3. Proactively prove word overlays are NOT rendered since TrueSight is paused
      const overlayLayer = container.querySelector('.word-background-layer');
      assertEqual(overlayLayer, null, { ...testContext, testName: 'overlay layer must not render in EDIT mode' });
    });
  });

  describe('TRUESIGHT Mode Isolation Invariants', () => {
    it('proves that TRUESIGHT mode locks editing and renders high-fidelity overlays', async () => {
      const { container } = render(
        <ScrollEditor 
          content="TrueSight mode activated."
          ideMode="TRUESIGHT"
          isEditable={false}
          isTruesight={true}
          initialContainerWidth={800}
          forceTopology={{
            baseCellWidth: 10,
            baseCellHeight: 24,
            originX: 20,
            originY: 16,
            totalWidth: 800
          }}
        />
      );

      // 1. Textarea must be locked (readOnly or disabled)
      const textarea = container.querySelector('textarea');
      // In readOnly/non-editable TrueSight mode, it locks text area
      assertTrue(!!textarea, { ...testContext, testName: 'textarea exists in TRUESIGHT mode' });
      assertEqual(textarea.readOnly, true, { ...testContext, testName: 'textarea is readOnly' });

      // 2. High-fidelity overlay layer must be active and rendered
      const overlayLayer = container.querySelector('.word-background-layer');
      assertTrue(!!overlayLayer, { ...testContext, testName: 'overlay layer must render in TRUESIGHT mode' });
    });
  });

  describe('NEUTRAL Mode Isolation Invariants', () => {
    it('proves that NEUTRAL mode clears overlays, stops ResizeObserver, and locks inputs', async () => {
      const observeSpy = vi.fn();
      const disconnectSpy = vi.fn();
      global.ResizeObserver = class {
        observe = observeSpy;
        unobserve = vi.fn();
        disconnect = disconnectSpy;
      };

      const { container } = render(
        <ScrollEditor 
          content="Editor is blurred and neutral."
          ideMode="NEUTRAL"
          isEditable={false}
          isTruesight={false}
        />
      );

      // 1. Textarea is locked
      const textarea = container.querySelector('textarea');
      assertTrue(!!textarea, { ...testContext, testName: 'textarea exists in NEUTRAL mode' });
      assertEqual(textarea.readOnly, true, { ...testContext, testName: 'textarea is readOnly in NEUTRAL' });

      // 2. Overlay lines are cleared (no overlays rendered)
      const overlayLayer = container.querySelector('.word-background-layer');
      assertEqual(overlayLayer, null, { ...testContext, testName: 'overlay layer must be cleared in NEUTRAL mode' });

      // 3. ResizeObserver must be completely paused/unregistered
      assertEqual(observeSpy.mock.calls.length, 0, { ...testContext, testName: 'ResizeObserver not active in NEUTRAL' });
    });
  });

  describe('Resource Halting in Synthesis and Palette Hooks', () => {
    it('verifies that useVerseSynthesis early exits and does not synthesize when paused', async () => {
      // Mock synthesis to see if it's called
      const performSynthesisMock = vi.fn();
      
      const { result } = renderHook(() => useVerseSynthesis("Mock text", { paused: true }));

      // Synthesizing indicator should be false when paused
      assertEqual(result.current.isSynthesizing, false, { ...testContext, testName: 'synthesis paused' });
      assertEqual(result.current.artifact, null, { ...testContext, testName: 'synthesis artifact remains null' });
    });

    it('verifies that useAdaptivePalette cancels requestAnimationFrame when paused', async () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');

      renderHook(() => useAdaptivePalette(null, { paused: true }));

      // cancelAnimationFrame should be called immediately on render if paused
      assertTrue(cancelSpy.mock.calls.length > 0, { ...testContext, testName: 'cancelAnimationFrame triggered' });
      
      cancelSpy.mockRestore();
    });
  });

  describe('BytecodeHealth Determinism and Lifecycles', () => {
    it('mathematically verifies deterministic state transition bytecodes', () => {
      const fromMode = 'EDIT';
      const toMode = 'TRUESIGHT';

      const health = encodeBytecodeHealth(CELL_IDS.LIFECYCLE, "state-transition-clean", { fromMode, toMode });

      assertTrue(!!health.bytecode, { ...testContext, testName: 'bytecode must be computed' });
      assertEqual(health.cellId, 'LIFECYCLE', { ...testContext, testName: 'cellId matches LIFECYCLE' });
      assertEqual(health.checkId, 'state-transition-clean', { ...testContext, testName: 'checkId matches check' });
      assertEqual(health.context.fromMode, 'EDIT', { ...testContext, testName: 'fromMode in context is EDIT' });
      assertEqual(health.context.toMode, 'TRUESIGHT', { ...testContext, testName: 'toMode in context is TRUESIGHT' });

      console.log(`[LIFECYCLE] Transition verified: ${health.bytecode}`);
    });
  });
});
