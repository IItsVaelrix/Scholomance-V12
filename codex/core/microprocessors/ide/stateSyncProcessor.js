/**
 * IDE State Sync Microprocessor
 * 
 * Synchronizes UI state changes to the Toolbar Bytecode Channel.
 * Decouples React event handlers from the Bytecode Bridge.
 */

import { ToolbarChannel } from '../../../../src/lib/truesight/compiler/toolbarBytecode.js';

/**
 * Synchronizes a single tool state to the toolbar channel.
 * 
 * @param {Object} payload - { tool, value }
 * @param {Object} _context
 * @returns {Promise<Object>} Status
 */
export async function syncIdeState(payload, _context) {
  const { tool, value } = payload;
  
  if (!tool) {
    return { ok: false, error: 'MISSING_TOOL' };
  }

  // Sync to the global bytecode channel
  ToolbarChannel.setTool(tool, value);

  return { 
    ok: true, 
    synced: tool, 
    value,
    timestamp: Date.now() 
  };
}
