import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const cwd = process.cwd();
const client = new Client({ name: 'Codex Backend', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [
    `--env-file=${cwd}/.env`,
    `${cwd}/codex/server/collab/mcp-bridge.js`,
  ],
  cwd,
  env: { ...process.env },
  stderr: 'pipe',
});

const parseTextJson = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const parseTool = (result) => parseTextJson(result?.content?.find((item) => item.type === 'text')?.text ?? null) ?? result;
const parseResource = (result) => parseTextJson(result?.contents?.[0]?.text ?? null) ?? result;

try {
  await client.connect(transport);
  const resources = await client.listResources();
  const statusResource = await client.readResource({ uri: 'collab://status' });
  const statusTool = await client.callTool({ name: 'collab_status_get', arguments: {} });
  const register = await client.callTool({
    name: 'collab_agent_register',
    arguments: {
      id: 'codex-backend',
      name: 'Codex Backend',
      role: 'backend',
      capabilities: ['node', 'fastify', 'schemas', 'mcp'],
    },
  });
  const heartbeat = await client.callTool({
    name: 'collab_agent_heartbeat',
    arguments: {
      id: 'codex-backend',
      status: 'online',
    },
  });

  console.log(JSON.stringify({
    ok: true,
    resource_count: resources?.resources?.length ?? 0,
    resources: (resources?.resources ?? []).map((resource) => resource.uri),
    status_resource: parseResource(statusResource),
    status_tool: parseTool(statusTool),
    register: parseTool(register),
    heartbeat: parseTool(heartbeat),
  }, null, 2));
} finally {
  await Promise.allSettled([
    typeof client.close === 'function' ? client.close() : Promise.resolve(),
    typeof transport.close === 'function' ? transport.close() : Promise.resolve(),
  ]);
}
