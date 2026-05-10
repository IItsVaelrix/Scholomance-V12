#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function main() {
    const args = process.argv.slice(2);
    const toolName = args[0];
    const toolArgs = args[1] ? JSON.parse(args[1]) : {};

    if (!toolName) {
        console.error('Usage: node scripts/call-mcp-tool.js <tool_name> [tool_args_json]');
        process.exit(1);
    }

    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [
            '--env-file=' + path.join(ROOT, '.env'),
            path.join(ROOT, 'codex/server/collab/mcp-bridge.js'),
        ],
        cwd: ROOT,
    });

    const client = new Client({
        name: 'Scholomance Tool Caller',
        version: '1.0.0',
    });

    await client.connect(transport);

    try {
        const result = await client.callTool({
            name: toolName,
            arguments: toolArgs,
        });

        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Tool call failed:', error);
        process.exit(1);
    } finally {
        await client.close();
    }
}

main().catch(console.error);
