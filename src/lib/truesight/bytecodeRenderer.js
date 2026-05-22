/**
 * TrueSight Bytecode Renderer Adapter
 * 
 * Provides an authoritative bridge to the core TrueSight decoder.
 * Required by VAELRIX LAW 5 to prevent UI surface files from importing codex/* directly.
 */

export { decodeBytecode } from '../../../codex/core/shared/truesight/bytecodeRenderer.js';
