import {
  BytecodeError,
  ERROR_CATEGORIES,
  ERROR_SEVERITY,
  MODULE_IDS,
  ERROR_CODES,
} from '../../pixelbrain/bytecode-error.js';

export const MAX_LAYOUT_DEPTH = 5;
export const MAX_SERIALIZED_BYTES = 65536;

/**
 * Validate a single DIV layout node recursively.
 * @param {Object} node - The layout node to validate.
 * @param {number} depth - The current recursion depth.
 * @returns {string[]} List of validation error messages.
 */
export function validateDivLayout(node, depth = 0) {
  const errors = [];

  if (!node || typeof node !== 'object') {
    return ['Layout node must be a valid non-null object'];
  }

  if (depth > MAX_LAYOUT_DEPTH) {
    return [`Recursion depth exceeds maximum limit of ${MAX_LAYOUT_DEPTH}`];
  }

  if (!node.id || typeof node.id !== 'string') {
    errors.push('Layout node is missing required "id" field of type string');
  }

  if (!node.type || typeof node.type !== 'string') {
    errors.push('Layout node is missing required "type" field of type string');
  } else if (!['container', 'element', 'voxel'].includes(node.type)) {
    errors.push(`Invalid node type: "${node.type}". Allowed: container, element, voxel`);
  }

  if (!node.role || typeof node.role !== 'string') {
    errors.push('Layout node is missing required "role" field of type string');
  } else {
    const validRoles = [
      'wrapper',
      'card',
      'header',
      'content',
      'footer',
      'grid',
      'row',
      'column',
      'text',
      'button',
      'badge',
      'glow-container',
      'voxel-scene',
    ];
    if (!validRoles.includes(node.role)) {
      errors.push(`Invalid role: "${node.role}"`);
    }
    if (node.type === 'voxel' && node.role !== 'voxel-scene') {
      errors.push(`Nodes with type "voxel" must use role "voxel-scene", got "${node.role}"`);
    }
  }

  // Enforce additionalProperties = false by checking allowed keys
  const allowedKeys = ['id', 'type', 'role', 'layout', 'style', 'props', 'children'];
  const unknownKeys = Object.keys(node).filter(k => !allowedKeys.includes(k));
  if (unknownKeys.length > 0) {
    errors.push(`Unknown properties in layout node: ${unknownKeys.join(', ')}`);
  }

  // Validate layout object
  if (node.layout !== undefined) {
    if (typeof node.layout !== 'object' || node.layout === null) {
      errors.push('node.layout must be an object');
    } else {
      const allowedLayout = [
        'display', 'position', 'top', 'left', 'right', 'bottom',
        'width', 'height', 'padding', 'margin', 'gap',
        'flexDirection', 'justifyContent', 'alignItems',
        'gridTemplateColumns', 'gridTemplateRows'
      ];
      const unknownLayout = Object.keys(node.layout).filter(k => !allowedLayout.includes(k));
      if (unknownLayout.length > 0) {
        errors.push(`Unknown properties in layout object: ${unknownLayout.join(', ')}`);
      }

      const {
        display, position, top, left, right, bottom,
        flexDirection, justifyContent, alignItems
      } = node.layout;

      if (display !== undefined && !['flex', 'grid', 'block', 'none'].includes(display)) {
        errors.push(`Invalid display value: "${display}"`);
      }
      if (position !== undefined && !['relative', 'absolute', 'fixed', 'sticky'].includes(position)) {
        errors.push(`Invalid position value: "${position}"`);
      }
      if (flexDirection !== undefined && !['row', 'column', 'row-reverse', 'column-reverse'].includes(flexDirection)) {
        errors.push(`Invalid flexDirection value: "${flexDirection}"`);
      }
      if (justifyContent !== undefined && !['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'].includes(justifyContent)) {
        errors.push(`Invalid justifyContent value: "${justifyContent}"`);
      }
      if (alignItems !== undefined && !['flex-start', 'flex-end', 'center', 'stretch', 'baseline'].includes(alignItems)) {
        errors.push(`Invalid alignItems value: "${alignItems}"`);
      }

      // Check numeric fields
      const numericFields = ['top', 'left', 'right', 'bottom', 'width', 'height', 'padding', 'margin', 'gap'];
      for (const field of numericFields) {
        const val = node.layout[field];
        if (val !== undefined) {
          if (typeof val === 'number') {
            if (!Number.isFinite(val)) {
              errors.push(`Layout property "${field}" must be a finite number`);
            }
          } else if (typeof val !== 'string') {
            errors.push(`Layout property "${field}" must be a number or a string`);
          }
        }
      }
    }
  }

  // Validate style object
  if (node.style !== undefined) {
    if (typeof node.style !== 'object' || node.style === null) {
      errors.push('node.style must be an object');
    } else {
      const allowedStyle = ['variant', 'glowColor', 'borderRadius', 'opacity'];
      const unknownStyle = Object.keys(node.style).filter(k => !allowedStyle.includes(k));
      if (unknownStyle.length > 0) {
        errors.push(`Unknown properties in style object: ${unknownStyle.join(', ')}`);
      }

      const { variant, glowColor, opacity } = node.style;
      if (variant !== undefined && !['glassmorphic', 'neonBorder', 'obsidianPanel', 'solid', 'transparent'].includes(variant)) {
        errors.push(`Invalid style variant: "${variant}"`);
      }
      if (glowColor !== undefined && !['sonic', 'psychic', 'void', 'alchemy', 'will'].includes(glowColor)) {
        errors.push(`Invalid glowColor: "${glowColor}"`);
      }
      if (opacity !== undefined) {
        if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
          errors.push('Style opacity must be a number between 0 and 1');
        }
      }
    }
  }

  // Validate props object
  if (node.props !== undefined) {
    if (typeof node.props !== 'object' || node.props === null) {
      errors.push('node.props must be an object');
    } else {
      const allowedProps = ['text', 'icon', 'title', 'subtitle', 'interactive', 'onClickAction', 'seed', 'volumeSize'];
      const unknownProps = Object.keys(node.props).filter(k => !allowedProps.includes(k));
      if (unknownProps.length > 0) {
        errors.push(`Unknown properties in props object: ${unknownProps.join(', ')}`);
      }
    }
  }

  // Validate children recursively
  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      errors.push('node.children must be an array');
    } else {
      for (const child of node.children) {
        const childErrors = validateDivLayout(child, depth + 1);
        errors.push(...childErrors);
      }
    }
  }

  return errors;
}

/**
 * Validate a complete DIV layout proposal wrapping a layout tree.
 * @param {Object} proposal - The proposal object.
 * @returns {Object} Validation outcome with error log and BytecodeError wrapper.
 */
export function validateDivProposal(proposal) {
  const errors = [];

  if (!proposal || typeof proposal !== 'object') {
    return { valid: false, ok: false, code: 'DIV_LAYOUT_REJECTED', errors: ['Proposal must be a valid non-null object'] };
  }

  try {
    const serialized = JSON.stringify(proposal);
    if (serialized.length > MAX_SERIALIZED_BYTES) {
      errors.push(`Proposal serialized size of ${serialized.length} bytes exceeds limit of ${MAX_SERIALIZED_BYTES}`);
    }
  } catch (e) {
    errors.push('Proposal is not a stringifiable JSON object');
  }

  const allowedProposalKeys = ['rationale', 'confidence', 'reviewRequired', 'sourceIntentHash', 'evalSuiteId', 'proposedLayout'];
  const unknownKeys = Object.keys(proposal).filter(k => !allowedProposalKeys.includes(k));
  if (unknownKeys.length > 0) {
    errors.push(`Unknown properties in proposal: ${unknownKeys.join(', ')}`);
  }

  if (proposal.rationale === undefined || typeof proposal.rationale !== 'string') {
    errors.push('Proposal is missing required "rationale" field of type string');
  }
  if (proposal.confidence === undefined || typeof proposal.confidence !== 'number') {
    errors.push('Proposal is missing required "confidence" field of type number');
  } else if (proposal.confidence < 0 || proposal.confidence > 1) {
    errors.push('Proposal confidence must be between 0 and 1');
  }
  if (proposal.reviewRequired === undefined || typeof proposal.reviewRequired !== 'boolean') {
    errors.push('Proposal is missing required "reviewRequired" field of type boolean');
  }

  if (proposal.proposedLayout === undefined || typeof proposal.proposedLayout !== 'object' || proposal.proposedLayout === null) {
    errors.push('Proposal is missing required "proposedLayout" object');
  } else {
    const layoutErrors = validateDivLayout(proposal.proposedLayout, 0);
    errors.push(...layoutErrors);
  }

  if (errors.length > 0) {
    const bytecodeError = new BytecodeError(
      ERROR_CATEGORIES.FORMULA,
      ERROR_SEVERITY.CRIT,
      MODULE_IDS.IMG_FORMULA,
      ERROR_CODES.FORMULA_INVALID_SYNTAX,
      { errors }
    );
    return {
      valid: false,
      ok: false,
      code: 'DIV_LAYOUT_REJECTED',
      bytecodeError,
      errors
    };
  }

  return {
    valid: true,
    ok: true,
    errors: []
  };
}
