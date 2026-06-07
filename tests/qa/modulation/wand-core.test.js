/**
 * SCHOLOMANCE FAIRLY ODD WAND — CORE LAW & INTEGRITY AUDIT
 * ══════════════════════════════════════════════════════════════════════════════
 * Domain: Bounded Mathematical Authoring & Deterministic Validation
 * Purpose: Automated QA suite validating the fail-closed schema checks, recursive bounds,
 *          BytecodeError wrapping, and FNV-1a deterministic hashing.
 */

import { describe, it, expect } from 'vitest';
import { validateFormula, validateProposal } from '../../../codex/core/modulation/planner/formula-validator.js';
import { composeFormulaProcessor } from '../../../codex/core/modulation/processors/compose-formula.js';
import { generateCatalogId, serializeDeterministic, computeFNV1a } from '../../../codex/core/modulation/planner/formula-registrar.js';
import { roleDispatcher } from '../../../src/ui/features/mysticHolistics/hero/roleDispatcher.ts';
import { snapToPixelGrid, resolvePixelGridSize, evaluateFormula, padFlatVectorToPowerOfTwo, quantizeFlatCoordinates } from '../../../src/lib/engine.adapter.js';
import { parseBytecodeToFormula, formulaToBytecode } from '../../../codex/core/pixelbrain/image-to-bytecode-formula.js';
import { normalizeVectorizedText } from '../../../codex/core/pixelbrain/formula-to-coordinates.js';



describe('Wand System — Core & Validation Laws', () => {

  // ── 1. SCHEMA BOUNDARIES & DISCRIMINATOR GAUNTLET ────────────────────────────

  describe('Discriminator and Boundary Enforcement', () => {
    it('rejects a formula with an invalid type discriminator', () => {
      const formula = { type: 'invalid_type_name', parameters: { a: 10 } };
      const errors = validateFormula(formula);
      expect(errors.some(err => err.includes('Invalid formula type'))).toBe(true);
    });

    it('rejects unknown properties under additionalProperties = false policy', () => {
      const formula = {
        type: 'parametric_curve',
        parameters: { a: 100, n: 10 },
        unallowedKey: 'smuggle'
      };
      const errors = validateFormula(formula);
      expect(errors.some(err => err.includes('Unknown properties'))).toBe(true);
    });

    it('enforces parametric samples limit (n <= 512)', () => {
      const validFormula = {
        type: 'parametric_curve',
        parameters: { cx: 400, cy: 300, a: 100, b: 2, c: 0, n: 512 }
      };
      expect(validateFormula(validFormula)).toHaveLength(0);

      const invalidFormula = {
        type: 'parametric_curve',
        parameters: { cx: 400, cy: 300, a: 100, b: 2, c: 0, n: 513 }
      };
      const errors = validateFormula(invalidFormula);
      expect(errors.some(err => err.includes('must be in range'))).toBe(true);
    });

    it('enforces fractal iterations limit (iterations <= 5)', () => {
      const validFractal = {
        type: 'fractal_iter',
        iterations: 5,
        baseShape: 'triangle',
        scale: 10
      };
      expect(validateFormula(validFractal)).toHaveLength(0);

      const invalidFractal = {
        type: 'fractal_iter',
        iterations: 6,
        baseShape: 'triangle',
        scale: 10
      };
      const errors = validateFormula(invalidFractal);
      expect(errors.some(err => err.includes('must be in range'))).toBe(true);
    });

    it('enforces minimum grid cellSize >= 4', () => {
      const invalidGrid = {
        type: 'grid_projection',
        gridType: 'rectangular',
        cellSize: 3
      };
      const errors = validateFormula(invalidGrid);
      expect(errors.some(err => err.includes('must be in range'))).toBe(true);
    });
  });

  // ── 2. RECURSION & COMPOSITE EXPLOIT PRUNING ─────────────────────────────────

  describe('Recursion and Composite Hardening', () => {
    it('capping composite recursive depth at exactly 4 layers', () => {
      // Depth 4 is valid
      const depth4 = {
        type: 'composite',
        children: [{
          role: 'shrine.altar',
          anchor: { x: 0.5, y: 0.5 },
          formula: {
            type: 'composite',
            children: [{
              role: 'shrine.window',
              anchor: { x: 0.5, y: 0.5 },
              formula: {
                type: 'composite',
                children: [{
                  role: 'shrine.moon',
                  anchor: { x: 0.5, y: 0.5 },
                  formula: {
                    type: 'parametric_curve',
                    parameters: { n: 10 }
                  }
                }]
              }
            }]
          }
        }]
      };
      expect(validateFormula(depth4)).toHaveLength(0);

      // Depth 5 exceeds max limit (nested composites: depth 0 -> 1 -> 2 -> 3 -> 4 -> 5)
      const depth5 = {
        type: 'composite',
        children: [{
          role: 'layer1',
          anchor: { x: 0.5, y: 0.5 },
          formula: {
            type: 'composite',
            children: [{
              role: 'layer2',
              anchor: { x: 0.5, y: 0.5 },
              formula: {
                type: 'composite',
                children: [{
                  role: 'layer3',
                  anchor: { x: 0.5, y: 0.5 },
                  formula: {
                    type: 'composite',
                    children: [{
                      role: 'layer4',
                      anchor: { x: 0.5, y: 0.5 },
                      formula: {
                        type: 'composite',
                        children: [{
                          role: 'layer5',
                          anchor: { x: 0.5, y: 0.5 },
                          formula: {
                            type: 'parametric_curve',
                            parameters: { n: 10 }
                          }
                        }]
                      }
                    }]
                  }
                }]
              }
            }]
          }
        }]
      };
      const errors = validateFormula(depth5);
      expect(errors.some(err => err.includes('Recursion depth exceeds maximum limit'))).toBe(true);
    });

    it('rejects composites containing more than 12 child formulas', () => {
      const children = Array.from({ length: 13 }, (_, i) => ({
        role: `child-${i}`,
        anchor: { x: 0.5, y: 0.5 },
        formula: { type: 'parametric_curve', parameters: { n: 5 } }
      }));
      const formula = { type: 'composite', children };
      const errors = validateFormula(formula);
      expect(errors.some(err => err.includes('exceeds maximum limit of 12'))).toBe(true);
    });
  });

  // ── 3. DETECTING PAYLOAD OVERRUNS & BYTECODE DIAGNOSTICS ──────────────────────

  describe('Bytecode Error Wrapping & Serialized Budget Limits', () => {
    it('rejects payloads larger than 64KB (65536 bytes)', () => {
      const hugeRationale = 'a'.repeat(70000);
      const hugeProposal = {
        rationale: hugeRationale,
        confidence: 0.9,
        reviewRequired: false,
        proposedFormula: {
          role: 'shrine.altar',
          formula: { type: 'parametric_curve', parameters: { n: 10 } }
        }
      };

      const result = validateProposal(hugeProposal);
      expect(result.valid).toBe(false);
      expect(result.code).toBe('FORMULA_PROPOSAL_REJECTED');
      expect(result.errors.some(err => err.includes('exceeds maximum limit of 65536 bytes'))).toBe(true);
      expect(result.bytecodeError).toBeDefined();
      expect(result.bytecodeError.bytecode).toMatch(/^PB-ERR-v1-FORMULA-CRIT-IMGFOR-0B03/);
    });

    it('returns a robust BytecodeError payload on validation failure', () => {
      const badProposal = {
        rationale: 'Invalid confidence value',
        confidence: 9.9, // Limit is 1.0
        reviewRequired: false,
        proposedFormula: {
          role: 'shrine.altar',
          formula: { type: 'parametric_curve', parameters: { n: 10 } }
        }
      };

      const result = validateProposal(badProposal);
      expect(result.valid).toBe(false);
      expect(result.ok).toBe(false);
      expect(result.code).toBe('FORMULA_PROPOSAL_REJECTED');
      expect(result.errors.some(err => err.includes('confidence must be a number between 0 and 1'))).toBe(true);
      expect(result.bytecodeError).toBeDefined();
      expect(result.bytecodeError.bytecode).toMatch(/^PB-ERR-v1-FORMULA-CRIT-IMGFOR-0B03/);
    });
  });

  // ── 4. CANONICAL HASHING & REGISTRAR IDEMPOTENCY ─────────────────────────────

  describe('Canonical Serializer and FNV-1a Hash Uniqueness', () => {
    it('sorts keys during serialization to ensure semantic identical objects hash identically', () => {
      const objA = { type: 'fibonacci', parameters: { scale: 1, iterations: 6 } };
      const objB = { parameters: { iterations: 6, scale: 1 }, type: 'fibonacci' };

      const serializedA = serializeDeterministic(objA);
      const serializedB = serializeDeterministic(objB);

      expect(serializedA).toBe(serializedB);
      expect(computeFNV1a(serializedA)).toBe(computeFNV1a(serializedB));
    });

    it('generates deterministic catalogIds from role, formula bytes, and intent', () => {
      const role = 'shrine.altar';
      const formula = { type: 'parametric_curve', parameters: { n: 10 } };
      const intent = 'test-altar-1';

      const id1 = generateCatalogId(role, formula, intent);
      const id2 = generateCatalogId(role, formula, intent);
      
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^cat-[0-9a-f]{8}$/);
    });
  });

  // ── 5. RUNTIME OVERFLOW CAP & SAFETY VALVE ───────────────────────────────────

  describe('Runtime Budgets and Coordinate Truncation', () => {
    it('truncates coordinate streams in the fusion stage if they exceed 2000 points', async () => {
      // Create a composite formula that evaluates to a huge number of coordinates
      const childFormula = {
        type: 'parametric_curve',
        parameters: { cx: 400, cy: 300, a: 100, b: 2, c: 0, n: 500 } // generates 500 points per child
      };
      
      // 5 children * 500 points = 2500 points total
      const compositeProposal = {
        rationale: 'Generating massive point count to trigger cap',
        confidence: 0.9,
        reviewRequired: false,
        proposedFormula: {
          role: 'shrine.altar',
          formula: {
            type: 'composite',
            children: [
              { role: 'shrine.window', anchor: { x: 0.2, y: 0.2 }, size: { w: 0.1, h: 0.1 }, formula: childFormula },
              { role: 'shrine.window', anchor: { x: 0.4, y: 0.2 }, size: { w: 0.1, h: 0.1 }, formula: childFormula },
              { role: 'shrine.window', anchor: { x: 0.6, y: 0.2 }, size: { w: 0.1, h: 0.1 }, formula: childFormula },
              { role: 'shrine.window', anchor: { x: 0.8, y: 0.2 }, size: { w: 0.1, h: 0.1 }, formula: childFormula },
              { role: 'shrine.window', anchor: { x: 0.5, y: 0.5 }, size: { w: 0.1, h: 0.1 }, formula: childFormula },
            ]
          }
        }
      };

      const payload = { coordinates: [] };
      const context = {
        scene: { 'compose-formula': { formulas: [compositeProposal] } },
        diagnostics: [],
        metrics: {}
      };

      const output = await composeFormulaProcessor(payload, {}, context);
      
      // Coordinates should be strictly capped at 2000 points
      expect(output.coordinates.length).toBe(2000);
      expect(context.diagnostics.some(diag => diag.type === 'FORMULA_EVAL_WARN')).toBe(true);
      expect(context.diagnostics.find(diag => diag.type === 'FORMULA_EVAL_WARN').message).toContain(
        'Evaluation generated 2500 points, which exceeds the safety cap of 2000'
      );
    });
  });

  // ── 6. PIXELBRAIN BYTECODE SYNERGY INTEGRATION ────────────────────────────────

  describe('PixelBrain Bytecode Synergy Integration', () => {
    it('successfully processes a standalone valid bytecode string proposal', async () => {
      const bytecodeProposal = '0xFP_16x16_4c_d0_gg3';
      const payload = { coordinates: [] };
      const context = {
        scene: { 'compose-formula': { formulas: [bytecodeProposal] } },
        diagnostics: [],
        metrics: {}
      };

      const output = await composeFormulaProcessor(payload, {}, context);
      
      expect(context.diagnostics.filter(d => d.type !== 'FORMULA_COORDS_SNAPPED')).toHaveLength(0);
      expect(context.metrics.rejectedProposals).toBe(0);
      expect(output.coordinates.length).toBeGreaterThan(0);
      expect(output.coordinates[0].role).toBe('shrine.altar');
      expect(output.coordinates[0].material).toBe('aura');
    });

    it('successfully processes a proposal with a nested bytecode formula', async () => {
      const proposal = {
        rationale: 'Custom shrine candle with inline bytecode',
        confidence: 0.95,
        reviewRequired: false,
        proposedFormula: {
          role: 'shrine.candle',
          material: 'fire',
          formula: '0xFP_24x24_8c_d1_gg5'
        }
      };

      const payload = { coordinates: [] };
      const context = {
        scene: { 'compose-formula': { formulas: [proposal] } },
        diagnostics: [],
        metrics: {}
      };

      const output = await composeFormulaProcessor(payload, {}, context);

      expect(context.diagnostics.filter(d => d.type !== 'FORMULA_COORDS_SNAPPED')).toHaveLength(0);
      expect(context.metrics.rejectedProposals).toBe(0);
      expect(output.coordinates.length).toBeGreaterThan(0);
      expect(output.coordinates[0].role).toBe('shrine.candle');
      expect(output.coordinates[0].material).toBe('fire');
    });

    it('fail-closed: rejects invalid bytecode strings violating schema limits and logs diagnostics', async () => {
      const invalidBytecode = '0xFG_2x2_4c_d0_gg3';
      const payload = { coordinates: [] };
      const context = {
        scene: { 'compose-formula': { formulas: [invalidBytecode] } },
        diagnostics: [],
        metrics: {}
      };

      const output = await composeFormulaProcessor(payload, {}, context);

      expect(output.coordinates).toHaveLength(0);
      expect(context.metrics.rejectedProposals).toBe(1);
      expect(context.diagnostics).toHaveLength(1);
      expect(context.diagnostics[0].type).toBe('FORMULA_PROPOSAL_REJECTED');
      expect(context.diagnostics[0].errors.some(err => err.includes('must be in range'))).toBe(true);
    });
  });

  // ── 7. PHASE 2 SNAPPING & FALLBACK VERIFICATION ──────────────────────────────

  describe('Phase 2 Snapping & Fallback Verification', () => {
    
    // Snapping tests:
    describe('Grid Snapping Behavior', () => {
      it('snaps coordinates x and y to multiples of gridSize', () => {
        const coords = [
          { x: 10, y: 15 },
          { x: 23, y: 34 }
        ];
        const snapped = snapToPixelGrid(coords, 16);
        expect(snapped[0].x).toBe(16);
        expect(snapped[0].y).toBe(16);
        expect(snapped[1].x).toBe(16);
        expect(snapped[1].y).toBe(32);
      });

      it('ensures snappedX and snappedY match x and y', () => {
        const coords = [
          { x: 10, y: 15 }
        ];
        const snapped = snapToPixelGrid(coords, 16);
        expect(snapped[0].snappedX).toBe(snapped[0].x);
        expect(snapped[0].snappedY).toBe(snapped[0].y);
      });

      it('falls back to gridSize 1 for invalid or zero grid size', () => {
        const coords = [{ x: 10.4, y: 15.6 }];
        const snappedNull = snapToPixelGrid(coords, null);
        const snappedZero = snapToPixelGrid(coords, 0);
        
        expect(snappedNull[0].x).toBe(10);
        expect(snappedNull[0].y).toBe(16);
        
        expect(snappedZero[0].x).toBe(10);
        expect(snappedZero[0].y).toBe(16);
      });

      it('produces identical output for identical input + grid size (idempotency)', () => {
        const coords = [{ x: 10, y: 15 }];
        const snapped1 = snapToPixelGrid(coords, 8);
        const snapped2 = snapToPixelGrid(snapped1, 8);
        
        expect(snapped1[0].x).toBe(8);
        expect(snapped1[0].y).toBe(16);
        expect(snapped2[0].x).toBe(8);
        expect(snapped2[0].y).toBe(16);
      });

      it('generates different snapped output for different grid sizes', () => {
        const coords = [{ x: 12, y: 12 }];
        const snapped8 = snapToPixelGrid(coords, 8);
        const snapped16 = snapToPixelGrid(coords, 16);
        
        expect(snapped8[0].x).toBe(16);
        expect(snapped16[0].x).toBe(16);
        
        const coords2 = [{ x: 10, y: 10 }];
        const snapped8_2 = snapToPixelGrid(coords2, 8);
        const snapped16_2 = snapToPixelGrid(coords2, 16);
        expect(snapped8_2[0].x).toBe(8);
        expect(snapped16_2[0].x).toBe(16);
      });

      it('works correctly for both array input and single object input', () => {
        const coordObj = { x: 10, y: 15 };
        const snappedObj = snapToPixelGrid(coordObj, 16);
        expect(snappedObj.x).toBe(16);
        expect(snappedObj.y).toBe(16);

        const coordArr = [{ x: 10, y: 15 }];
        const snappedArr = snapToPixelGrid(coordArr, 16);
        expect(snappedArr[0].x).toBe(16);
        expect(snappedArr[0].y).toBe(16);
      });
    });

    // Composer integration tests:
    describe('Composer Grid Integration', () => {
      it('composeFormulaProcessor snaps after evaluation and diagnostics include selected gridSize', async () => {
        const proposal = {
          rationale: 'Valid shrine candle with grid size params',
          confidence: 0.95,
          reviewRequired: false,
          proposedFormula: {
            role: 'shrine.candle',
            material: 'fire',
            formula: {
              type: 'parametric_curve',
              parameters: { cx: 400, cy: 300, a: 100, b: 2, c: 0, n: 10 }
            }
          }
        };

        const payload = { coordinates: [] };
        const context = {
          scene: { 'compose-formula': { formulas: [proposal] } },
          canvasSize: { width: 800, height: 600, gridSize: 16 },
          diagnostics: [],
          metrics: {}
        };

        const output = await composeFormulaProcessor(payload, {}, context);
        
        expect(output.coordinates.length).toBeGreaterThan(0);
        // Verify snapped x/y coordinates are multiples of 16
        output.coordinates.forEach(c => {
          expect(c.x % 16).toBe(0);
          expect(c.y % 16).toBe(0);
        });

        // Verify diagnostics contains the selected gridSize
        const snapDiag = context.diagnostics.find(d => d.type === 'FORMULA_COORDS_SNAPPED');
        expect(snapDiag).toBeDefined();
        expect(snapDiag.gridSize).toBe(16);
      });

      it('snapping does not bypass formula validation', async () => {
        const invalidProposal = {
          rationale: 'Invalid parameters count to trigger schema rejection',
          confidence: 0.95,
          reviewRequired: false,
          proposedFormula: {
            role: 'shrine.candle',
            material: 'fire',
            formula: {
              type: 'parametric_curve',
              parameters: { cx: 400, cy: 300, a: 100, b: 2, c: 0, n: 513 } // exceeds 512 max limit
            }
          }
        };

        const payload = { coordinates: [] };
        const context = {
          scene: { 'compose-formula': { formulas: [invalidProposal] } },
          canvasSize: { width: 800, height: 600, gridSize: 16 },
          diagnostics: [],
          metrics: {}
        };

        const output = await composeFormulaProcessor(payload, {}, context);
        expect(output.coordinates).toHaveLength(0);
        expect(context.metrics.rejectedProposals).toBe(1);
        expect(context.diagnostics.some(d => d.type === 'FORMULA_PROPOSAL_REJECTED')).toBe(true);
      });

      it('composite child coordinates are snapped after world-space placement, not before child scaling', async () => {
        const compositeProposal = {
          rationale: 'Testing composite relative coordinates placement and snapping',
          confidence: 0.95,
          reviewRequired: false,
          proposedFormula: {
            role: 'shrine.window',
            material: 'gold',
            formula: {
              type: 'composite',
              children: [
                {
                  role: 'shrine.moon',
                  anchor: { x: 0.5, y: 0.5 },
                  size: { w: 0.5, h: 0.5 },
                  formula: {
                    type: 'parametric_curve',
                    parameters: { cx: 400, cy: 300, a: 10, b: 1, c: 0, n: 4 }
                  }
                }
              ]
            }
          }
        };

        const payload = { coordinates: [] };
        const context = {
          scene: { 'compose-formula': { formulas: [compositeProposal] } },
          canvasSize: { width: 800, height: 600, gridSize: 16 },
          diagnostics: [],
          metrics: {}
        };

        const output = await composeFormulaProcessor(payload, {}, context);
        expect(output.coordinates.length).toBeGreaterThan(0);
        output.coordinates.forEach(c => {
          expect(c.x % 16).toBe(0);
          expect(c.y % 16).toBe(0);
        });
      });
    });

    // Fallback drawer tests:
    describe('Canvas Fallback Drawer', () => {
      it('mocks canvas and verifies isolated render calls', () => {
        let saveCalled = 0;
        let restoreCalled = 0;
        let setLineDashParams = [];
        let strokeRectParams = [];
        let strokeCalled = 0;
        let beginPathCalled = 0;
        let moveToParams = [];
        let lineToParams = [];

        const mockCtx = {
          save() { saveCalled++; },
          restore() { restoreCalled++; },
          setLineDash(pattern) { setLineDashParams.push(pattern); },
          strokeRect(x, y, w, h) { strokeRectParams.push({ x, y, w, h }); },
          beginPath() { beginPathCalled++; },
          moveTo(x, y) { moveToParams.push({ x, y }); },
          lineTo(x, y) { lineToParams.push({ x, y }); },
          stroke() { strokeCalled++; },
          rect() {},
          fill() {},
          fillText() {}
        };

        const coords = [
          { x: 100, y: 150, role: 'unregistered.role' },
          { x: 200, y: 300, role: 'unregistered.role' }
        ];

        // Dispatch roles to trigger fallback
        roleDispatcher.dispatchRoles(mockCtx, coords, { width: 800, height: 600 });

        // Save & restore should be called to prevent state leaking
        // One is in dispatchRoles, one is in drawFallbackGlyphs (double-insulated!)
        expect(saveCalled).toBeGreaterThanOrEqual(1);
        expect(restoreCalled).toBeGreaterThanOrEqual(1);

        // Verify bounds dashed line configuration ([4, 4])
        expect(setLineDashParams).toContainEqual([4, 4]);
        
        // Verify computed bounds strokeRect called with correct dimensions:
        // minX=100, minY=150, w=100, h=150
        expect(strokeRectParams).toContainEqual({ x: 100, y: 150, w: 100, h: 150 });

        // Verify sequence path drawing is executed:
        expect(beginPathCalled).toBeGreaterThan(0);
        expect(setLineDashParams).toContainEqual([2, 4]);
        expect(moveToParams).toContainEqual({ x: 100, y: 150 });
        expect(lineToParams).toContainEqual({ x: 200, y: 300 });
        expect(strokeCalled).toBeGreaterThan(0);
      });

      it('safely handles empty coordinate arrays by doing nothing', () => {
        let saveCalled = 0;
        const mockCtx = {
          save() { saveCalled++; },
          restore() {}
        };

        roleDispatcher.dispatchRoles(mockCtx, [], { width: 800, height: 600 });
        expect(saveCalled).toBe(0);
      });
    });
  });

  // ── 8. TURBOQUANT INTEGRATION & VECTORIZED TEXT DIALECT ───────────────────────

  describe('TurboQuant Integration & Vectorized Text Dialect', () => {
    
    it('throws FORMULA_UNSUPPORTED_TYPE in strict mode for unrecognized formulas', () => {
      const formula = { coordinateFormula: { type: 'unrecognized_magic' } };
      expect(() => evaluateFormula(formula, { width: 100, height: 100 }, 0, { strict: true })).toThrow(/FORMULA_UNSUPPORTED_TYPE:unrecognized_magic/);
    });

    it('character set normalization strictly rejects non-approved symbols', () => {
      expect(normalizeVectorizedText('HELLO WORLD 123')).toBe('HELLO WORLD 123');
      // Lowercase is normalized to uppercase, so it passes
      expect(normalizeVectorizedText('hello')).toBe('HELLO');
      // Non-approved symbols throw syntax error
      expect(() => normalizeVectorizedText('HELLO@WORLD')).toThrow('FORMULA_INVALID_VECTORIZED_TEXT_CHARSET');
      expect(() => normalizeVectorizedText('100%')).toThrow('FORMULA_INVALID_VECTORIZED_TEXT_CHARSET');
    });

    it('symmetrically round-trips vectorized_text with the V type code', () => {
      const bytecode = '0xFV_16x16_4c_d0_gg3';
      const parsed = parseBytecodeToFormula(bytecode);
      expect(parsed.formulaType).toBe('vectorized_text');
      
      const serialized = formulaToBytecode(parsed);
      expect(serialized).toBe(bytecode);
    });

    it('pads flat vectors to the next power of two and returns exact padding metadata', () => {
      const vector = [1.0, 2.0, 3.0]; // length 3
      const padded = padFlatVectorToPowerOfTwo(vector);
      
      expect(padded.originalLength).toBe(3);
      expect(padded.paddedLength).toBe(4); // next power of 2
      expect(padded.padCount).toBe(1);
      expect(padded.padPolicy).toBe('trailing_zero_power2');
      expect(padded.values).toBeInstanceOf(Float32Array);
      expect(Array.from(padded.values)).toEqual([1.0, 2.0, 3.0, 0.0]);
    });

    it('calculates compression ratios correctly relative to unpadded original byte size', async () => {
      const flatCoords = [1.0, 2.0, 3.0]; // 3 coordinates (floats) -> 12 bytes unpadded
      const result = await quantizeFlatCoordinates(flatCoords);
      
      expect(result.ok).toBe(true);
      expect(result.originalLength).toBe(3);
      
      // Verify compression ratio formula: quantized length / (originalLength * BYTES_PER_ELEMENT)
      const expectedRatio = (result.quantized.data ? result.quantized.data.length : result.quantized.byteLength) / (3 * 4);
      expect(result.compressionRatio).toBe(expectedRatio);
    });

  });

  describe('Composite Child Rotation', () => {
    it('validates rotation properties on composite children successfully', () => {
      const validComposite = {
        type: 'composite',
        children: [{
          role: 'sigil.capsule',
          anchor: { x: 0.5, y: 0.5 },
          rotation: 45,
          rotationSpeed: 90,
          rotationSwingRange: 15,
          rotationSwingSpeed: 2.0,
          formula: {
            type: 'parametric_curve',
            parameters: { n: 10 }
          }
        }]
      };

      const errors = validateFormula(validComposite);
      expect(errors.length).toBe(0);
    });

    it('rejects invalid rotation properties on composite children', () => {
      const invalidComposite = {
        type: 'composite',
        children: [{
          role: 'sigil.capsule',
          anchor: { x: 0.5, y: 0.5 },
          rotation: 'invalid-string', // must be a number
          formula: {
            type: 'parametric_curve',
            parameters: { n: 10 }
          }
        }]
      };

      const errors = validateFormula(invalidComposite);
      expect(errors.some(err => err.includes('rotation must be a number'))).toBe(true);
    });

    it('rotates child coordinates around child local center during evaluation', async () => {
      // Setup a composite formula with one child having rotation: 90 degrees.
      // Sub-bounds of child: width: 100, height: 100. Local center is (50, 50).
      // Let's use edge_trace with a single point at (100, 50) relative to child canvas.
      // (100, 50) is 50px to the right of (50, 50).
      // Rotated 90 degrees clockwise around (50, 50), it becomes (50, 100).
      // With world anchor at (400, 300) -> world dx = 400 - 50 = 350, dy = 300 - 50 = 250.
      // The unrotated point would end up at x = 100 + 350 = 450, y = 50 + 250 = 300.
      // The rotated point (50, 100) should end up at x = 50 + 350 = 400, y = 100 + 250 = 350.
      const proposal = {
        rationale: 'Testing composite child coordinate rotation',
        confidence: 0.95,
        reviewRequired: false,
        proposedFormula: {
          role: 'shrine.window',
          material: 'gold',
          formula: {
            type: 'composite',
            children: [
              {
                role: 'shrine.moon',
                anchor: { x: 0.5, y: 0.5 },
                size: { w: 0.125, h: 0.16666 }, // 0.125 * 800 = 100 width, 0.16666 * 600 = 100 height
                rotation: 90,
                formula: {
                  type: 'edge_trace',
                  tracePath: [{ x: 100, y: 50 }]
                }
              }
            ]
          }
        }
      };

      const payload = { coordinates: [] };
      const context = {
        scene: { 'compose-formula': { formulas: [proposal] } },
        canvasSize: { width: 800, height: 600, gridSize: 1 }, // grid size 1 for no snapping shifts
        diagnostics: [],
        metrics: {}
      };

      const output = await composeFormulaProcessor(payload, {}, context);
      expect(output.coordinates).toHaveLength(1);
      const coord = output.coordinates[0];
      // Expected rotated coordinate is at (400, 350)
      expect(Math.round(coord.x)).toBe(400);
      expect(Math.round(coord.y)).toBe(350);
    });
  });
});

