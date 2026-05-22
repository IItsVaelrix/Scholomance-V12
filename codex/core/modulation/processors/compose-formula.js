/**
 * SCHOLOMANCE FAIRLY ODD WAND — COMPOSE-FORMULA PROCESSOR
 * 
 * Processor ID: `compose.formula.v1`
 * Stage: `compose-formula`
 * 
 * Resolves AI-emitted or user-submitted formula proposals.
 * Performs fail-closed validation. Evaluates formula coordinates 
 * in world-space and tags them with their semantic role and material.
 */

import { evaluateFormula } from '../../pixelbrain/formula-to-coordinates.js';
import { validateProposal } from '../planner/formula-validator.js';
import { parseBytecodeToFormula } from '../../pixelbrain/image-to-bytecode-formula.js';
import { snapToPixelGrid, resolvePixelGridSize } from '../../pixelbrain/anti-alias-control.js';



/**
 * Execute the compose-formula processor stage.
 * @param {Object} payload - The input frame payload. Contains `coordinates`.
 * @param {Object} params - The stack params for this processor.
 * @param {Object} params.formulas - Array of formula proposals.
 * @param {Object} context - Pipeline context. Includes `scene`, `canvasSize`, `time`, `diagnostics`, `metrics`.
 * @returns {Object} Output payload with updated coordinates.
 */
export async function composeFormulaProcessor(payload, params = {}, context = {}) {
  const formulas = params.formulas || context.scene?.['compose-formula']?.formulas || [];
  const canvasSize = context.canvasSize || { width: 800, height: 600 };
  const time = context.time || 0;

  // Initialize diagnostics and metrics if not present
  if (!context.diagnostics) context.diagnostics = [];
  if (!context.metrics) context.metrics = { rejectedProposals: 0, composedCoordinates: 0 };
  if (!context.metrics.rejectedProposals) context.metrics.rejectedProposals = 0;
  if (!context.metrics.composedCoordinates) context.metrics.composedCoordinates = 0;

  const currentCoords = Array.isArray(payload.coordinates) ? [...payload.coordinates] : [];

  for (const proposal of formulas) {
    let normalizedProposal = proposal;
    let validation;
    let parsingError = null;

    if (typeof proposal === 'string' && proposal.startsWith('0xF')) {
      try {
        const parsed = parseBytecodeToFormula(proposal);
        normalizedProposal = {
          rationale: `Deserialized from bytecode: ${proposal}`,
          confidence: 1.0,
          reviewRequired: false,
          proposedFormula: {
            role: 'shrine.altar',
            material: 'aura',
            formula: sanitizeParsedFormula(parsed.coordinateFormula)
          }
        };
      } catch (err) {
        parsingError = err;
      }
    } else if (proposal && typeof proposal === 'object' && proposal.proposedFormula && typeof proposal.proposedFormula === 'object') {
      if (typeof proposal.proposedFormula.formula === 'string' && proposal.proposedFormula.formula.startsWith('0xF')) {
        try {
          const parsed = parseBytecodeToFormula(proposal.proposedFormula.formula);
          normalizedProposal = {
            ...proposal,
            proposedFormula: {
              ...proposal.proposedFormula,
              formula: sanitizeParsedFormula(parsed.coordinateFormula)
            }
          };
        } catch (err) {
          parsingError = err;
        }
      }
    }

    if (parsingError) {
      validation = {
        valid: false,
        errors: [`Bytecode parsing failed: ${parsingError.message}`],
        bytecodeError: parsingError
      };
    } else {
      validation = validateProposal(normalizedProposal);
    }

    if (!validation.valid) {
      // Fail-closed: log structured diagnostic, increment rejection metric, and skip
      context.diagnostics.push({
        type: 'FORMULA_PROPOSAL_REJECTED',
        errors: validation.errors,
        bytecodeError: validation.bytecodeError?.bytecode || String(validation.bytecodeError),
        proposal: normalizedProposal
      });
      context.metrics.rejectedProposals += 1;
      continue;
    }

    // Evaluate valid proposal
    const { proposedFormula } = normalizedProposal;
    const evaluated = evaluateProposalFormula(proposedFormula, canvasSize, time);
    
    // Snapping logic matching resolved grid size
    const gridSize = resolvePixelGridSize({ canvasSize, context, params });
    const snappedCoordinates = snapToPixelGrid(evaluated, gridSize);

    // Enforce safety cap of 2000 points
    let finalCoords = snappedCoordinates;
    if (finalCoords.length > 2000) {
      context.diagnostics.push({
        type: 'FORMULA_EVAL_WARN',
        message: `Evaluation generated ${finalCoords.length} points, which exceeds the safety cap of 2000. Truncating coordinates.`,
        proposal: normalizedProposal
      });
      finalCoords = finalCoords.slice(0, 2000);
    }

    // Snapping diagnostic log matching structural verification requirements
    context.diagnostics.push({
      type: 'FORMULA_COORDS_SNAPPED',
      code: 'FORMULA_COORDS_SNAPPED',
      gridSize,
      beforeCount: evaluated.length,
      afterCount: finalCoords.length
    });

    // Merge evaluated coordinates into the main coordinates array
    currentCoords.push(...finalCoords);
    context.metrics.composedCoordinates += finalCoords.length;
  }

  return {
    ...payload,
    coordinates: currentCoords
  };
}

/**
 * Helper to evaluate a validated formula proposal structure recursively.
 * @param {Object} proposedFormula - The proposedFormula block.
 * @param {Object} canvasSize - Parent canvas bounds.
 * @param {number} time - Animation time.
 * @returns {Object[]} Tagged coordinate array.
 */
function evaluateProposalFormula(proposedFormula, canvasSize, time) {
  const { role, material = 'aura', formula } = proposedFormula;

  if (formula.type === 'composite') {
    const coords = [];
    formula.children.forEach(child => {
      // Calculate local dimensions of child bounding box
      const subWidth = (child.size?.w ?? 1.0) * canvasSize.width;
      const subHeight = (child.size?.h ?? 1.0) * canvasSize.height;
      const childCanvas = { width: subWidth, height: subHeight };

      // Evaluate child formula
      const rawCoords = evaluateFormula({ coordinateFormula: child.formula }, childCanvas, time);

      // Map unit-space anchor to world-space offset
      const worldAnchorX = child.anchor.x * canvasSize.width;
      const worldAnchorY = child.anchor.y * canvasSize.height;

      // Center the child on its anchor
      const dx = worldAnchorX - subWidth / 2;
      const dy = worldAnchorY - subHeight / 2;

      // Transform raw coords to parent bounds and tag them
      rawCoords.forEach(c => {
        coords.push({
          ...c,
          x: c.x + dx,
          y: c.y + dy,
          role: child.role,
          material: child.material || material,
          paletteChannel: child.paletteChannel !== undefined ? child.paletteChannel : proposedFormula.paletteChannel
        });
      });
    });
    return coords;
  } else {
    // Leaf formula evaluation
    const rawCoords = evaluateFormula({ coordinateFormula: formula }, canvasSize, time);
    return rawCoords.map(c => ({
      ...c,
      role,
      material,
      paletteChannel: proposedFormula.paletteChannel
    }));
  }
}

/**
 * Filter out extra/unknown keys that might be returned by the bytecode deserializer,
 * ensuring strict compliance with the fail-closed validation schema rules.
 * @param {Object} formula - The raw parsed formula object.
 * @returns {Object} Cleaned, schema-compliant formula object.
 */
function sanitizeParsedFormula(formula) {
  if (!formula || typeof formula !== 'object') return formula;
  
  const sanitized = { type: formula.type };
  
  switch (formula.type) {
    case 'parametric_curve':
      if (formula.parameters) sanitized.parameters = formula.parameters;
      break;
    case 'edge_trace':
      if (formula.tracePath) sanitized.tracePath = formula.tracePath;
      if (formula.unitTracePath) sanitized.unitTracePath = formula.unitTracePath;
      break;
    case 'fractal_iter':
      if (formula.iterations !== undefined) sanitized.iterations = formula.iterations;
      if (formula.baseShape !== undefined) sanitized.baseShape = formula.baseShape;
      if (formula.scale !== undefined) sanitized.scale = formula.scale;
      if (formula.cx !== undefined) sanitized.cx = formula.cx;
      if (formula.cy !== undefined) sanitized.cy = formula.cy;
      break;
    case 'grid_projection':
      if (formula.gridType !== undefined) sanitized.gridType = formula.gridType;
      if (formula.cellSize !== undefined) sanitized.cellSize = formula.cellSize;
      if (formula.snapStrength !== undefined) sanitized.snapStrength = formula.snapStrength;
      if (formula.gridWidth !== undefined) sanitized.gridWidth = formula.gridWidth;
      if (formula.gridHeight !== undefined) sanitized.gridHeight = formula.gridHeight;
      break;
    case 'fibonacci':
      if (formula.iterations !== undefined) sanitized.iterations = formula.iterations;
      if (formula.scale !== undefined) sanitized.scale = formula.scale;
      break;
    case 'template_based':
      if (formula.template) sanitized.template = formula.template;
      break;
    case 'composite':
      if (formula.children) {
        sanitized.children = formula.children.map(child => ({
          ...child,
          formula: sanitizeParsedFormula(child.formula)
        }));
      }
      break;
  }
  return sanitized;
}


