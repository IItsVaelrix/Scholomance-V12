#!/usr/bin/env node

/**
 * SDK-safe stdio entrypoint for MCP hosts.
 *
 * `mcp-bridge.js` owns the actual server. This file exists as the stable command
 * target used by package scripts and probes.
 */

import { main } from './mcp-bridge.js';

main().catch((error) => {
    console.error('MCP Bridge failed to ignite:', error);
    process.exit(1);
});
