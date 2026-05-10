/**
 * Animation AMP — Type Bridge
 * 
 * Provides TypeScript type definitions for Animation AMP in the UI layer.
 * This file lives in src/lib/ (exempt from layer-separation) and provides
 * JSDoc @type annotations for use in UI components.
 * 
 * @see ARCH_CONTRACT_OVERLAY_INTEGRITY.md - Layer separation requirements
 */

/**
 * @typedef {Object} AnimationIntent
 * @property {string} version - Schema version
 * @property {string} targetId - Unique target identifier
 * @property {string} [targetType] - Renderer target type
 * @property {string} [preset] - Preset name for common patterns
 * @property {string} trigger - What triggered the animation
 * @property {Object} [state] - Additional state for context-aware processors
 * @property {Object} [constraints] - Constraints and limits
 * @property {string[]} [requestedProcessors] - Explicitly requested processor chain
 * @property {Object} [metadata] - Metadata for diagnostics
 * @property {Object} [symmetry] - Symmetry context
 * @property {string} [bytecode] - Bytecode instruction
 */

/**
 * @typedef {Object} ResolvedMotionOutput
 * @property {string} version - Schema version
 * @property {string} targetId - Target identifier
 * @property {boolean} success - Was resolution successful
 * @property {string} renderer - Target renderer type
 * @property {Object} values - Final resolved motion values
 * @property {Object} [cssVariables] - CSS variable map
 * @property {Object} [framerTransition] - Framer Motion transition config
 * @property {Object} [phaserPayload] - Phaser-specific motion payload
 * @property {Object} [pixelBrainPayload] - PixelBrain-specific formula payload
 * @property {string[]} [bytecode] - Motion bytecode instructions
 * @property {string[]} diagnostics - Diagnostic messages
 * @property {Array} trace - Full processor trace
 * @property {Object} [performance] - Performance metadata
 */

/**
 * AnimationRenderer type union
 * @type {'framer'|'css'|'phaser'|'canvas'|'overlay'}
 */
export const AnimationRenderer = null;

/**
 * AnimationTrigger type union
 * @type {'mount'|'unmount'|'hover'|'focus'|'click'|'scroll'|'route-change'|'audio'|'state-change'|'idle'|'symmetry'|'bytecode'}
 */
export const AnimationTrigger = null;

/**
 * ProcessorStage type union
 * @type {'normalize'|'timing'|'transform'|'visual'|'sequence'|'reactive'|'constraint'|'symmetry'|'finalize'}
 */
export const ProcessorStage = null;
