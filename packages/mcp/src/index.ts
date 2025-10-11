import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from './z.js';

import { registerTestOrchestratorTools } from './testOrchestratorServer.js';
import { registerAuthFixturesTools } from './authFixturesServer.js';
import { registerDocsTools } from './docsServer.js';
import { registerEmulatorTools } from './emulatorServer.js';
import { registerRepoTools } from './repoServer.js';
import { registerHealthTools } from './healthServer.js';

async function main() {
  const server = new McpServer({
    name: 'interdomestik-mcp',
    version: '0.1.0',
  });

  // Register all the tools
  registerTestOrchestratorTools(server);
  registerAuthFixturesTools(server);
  registerDocsTools(server);
  registerEmulatorTools(server);
  registerRepoTools(server);
  registerHealthTools(server);

  // Register a tool to list all available tools
  server.registerTool(
    'list-tools',
    {
      title: 'List All Tools',
      description: 'Enumerate all available MCP tools in this server.',
      outputSchema: {
        tools: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          })
        ),
      },
    },
    async () => {
      const registeredTools = (server as any)._registeredTools;
      const tools = Object.entries(registeredTools).map(
        ([name, tool]: [string, any]) => ({
          name: name,
          description: tool.description,
        })
      );
      const output = { tools };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
        structuredContent: output,
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[interdomestik-mcp] Server error', error);
  process.exit(1);
});
